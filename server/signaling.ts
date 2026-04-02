import { randomBytes } from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

// ─── Types ────────────────────────────────────────────────────────────────────

type LobbyState = 'waiting' | 'playing';

interface Lobby {
  id: string;
  host: string;
  hostToken: string;
  hostPeerId?: string;
  players: string[];
  state: LobbyState;
}

interface ClientConnection {
  ws: WebSocket;
  username?: string;
  lobbyId?: string;
}

// ─── LobbyManager ─────────────────────────────────────────────────────────────

export class LobbyManager {
  private lobbies = new Map<string, Lobby>();

  createLobby(hostName: string): { lobbyId: string; hostToken: string } {
    const lobbyId = randomBytes(8).toString('hex');
    const hostToken = randomBytes(16).toString('hex');
    const lobby: Lobby = {
      id: lobbyId,
      host: hostName,
      hostToken,
      players: [hostName],
      state: 'waiting',
    };
    this.lobbies.set(lobbyId, lobby);
    return { lobbyId, hostToken };
  }

  joinLobby(lobbyId: string, playerName: string): Lobby {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) throw new Error('Lobby not found');
    if (lobby.state === 'playing') throw new Error('Game is in progress');
    if (lobby.players.length >= 8) throw new Error('Lobby is full');
    lobby.players.push(playerName);
    return lobby;
  }

  leaveLobby(lobbyId: string, playerName: string): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return;

    lobby.players = lobby.players.filter((p) => p !== playerName);

    // Delete lobby if empty or host left
    if (lobby.players.length === 0 || lobby.host === playerName) {
      this.lobbies.delete(lobbyId);
    }
  }

  removeLobby(lobbyId: string): void {
    this.lobbies.delete(lobbyId);
  }

  getLobby(lobbyId: string): Lobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  listLobbies(): Array<{ id: string; host: string; playerCount: number; state: LobbyState }> {
    return Array.from(this.lobbies.values()).map((l) => ({
      id: l.id,
      host: l.host,
      playerCount: l.players.length,
      state: l.state,
    }));
  }

  validateHostToken(lobbyId: string, token: string): boolean {
    const lobby = this.lobbies.get(lobbyId);
    return lobby?.hostToken === token;
  }

  setHostPeerId(lobbyId: string, peerId: string): void {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) lobby.hostPeerId = peerId;
  }

  setLobbyState(lobbyId: string, state: LobbyState): void {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) lobby.state = state;
  }
}

// ─── setupSignaling ────────────────────────────────────────────────────────────

export function setupSignaling(server: Server): LobbyManager {
  const lobbyManager = new LobbyManager();
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Map<WebSocket, ClientConnection>();

  // Upgrade only on /ws path
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url ?? '', `http://${request.headers.host}`);
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  function send(ws: WebSocket, message: object): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function broadcast(lobbyId: string, message: object, exclude?: WebSocket): void {
    for (const [ws, conn] of clients) {
      if (conn.lobbyId === lobbyId && ws !== exclude) {
        send(ws, message);
      }
    }
  }

  wss.on('connection', (ws: WebSocket) => {
    const conn: ClientConnection = { ws };
    clients.set(ws, conn);

    ws.on('message', (raw) => {
      let msg: { type: string; [key: string]: unknown };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case 'set-username': {
          conn.username = msg.username as string;
          send(ws, { type: 'username-set', username: conn.username });
          break;
        }

        case 'list-lobbies': {
          send(ws, { type: 'lobbies', lobbies: lobbyManager.listLobbies() });
          break;
        }

        case 'create-lobby': {
          if (!conn.username) {
            send(ws, { type: 'error', message: 'Set a username first' });
            break;
          }
          const { lobbyId, hostToken } = lobbyManager.createLobby(conn.username);
          conn.lobbyId = lobbyId;
          send(ws, { type: 'lobby-created', lobbyId, hostToken });
          break;
        }

        case 'join-lobby': {
          if (!conn.username) {
            send(ws, { type: 'error', message: 'Set a username first' });
            break;
          }
          try {
            const lobby = lobbyManager.joinLobby(msg.lobbyId as string, conn.username);
            conn.lobbyId = lobby.id;
            send(ws, { type: 'lobby-joined', lobbyId: lobby.id, players: lobby.players, hostPeerId: lobby.hostPeerId });
            broadcast(lobby.id, { type: 'player-joined', username: conn.username, players: lobby.players }, ws);
          } catch (e: unknown) {
            send(ws, { type: 'error', message: (e as Error).message });
          }
          break;
        }

        case 'leave-lobby': {
          if (conn.lobbyId && conn.username) {
            const lobbyId = conn.lobbyId;
            broadcast(lobbyId, { type: 'player-left', username: conn.username }, ws);
            lobbyManager.leaveLobby(lobbyId, conn.username);
            conn.lobbyId = undefined;
          }
          break;
        }

        case 'set-peer-id': {
          if (conn.lobbyId) {
            lobbyManager.setHostPeerId(conn.lobbyId, msg.peerId as string);
            broadcast(conn.lobbyId, { type: 'host-peer-id', peerId: msg.peerId }, ws);
          }
          break;
        }

        case 'start-game': {
          if (conn.lobbyId) {
            const lobbyId = conn.lobbyId;
            const hostToken = msg.hostToken as string;
            if (!lobbyManager.validateHostToken(lobbyId, hostToken)) {
              send(ws, { type: 'error', message: 'Not authorized' });
              break;
            }
            lobbyManager.setLobbyState(lobbyId, 'playing');
            broadcast(lobbyId, { type: 'game-started', seed: msg.seed });
          }
          break;
        }

        case 'end-round': {
          if (conn.lobbyId) {
            const lobbyId = conn.lobbyId;
            const hostToken = msg.hostToken as string;
            if (!lobbyManager.validateHostToken(lobbyId, hostToken)) {
              send(ws, { type: 'error', message: 'Not authorized' });
              break;
            }
            lobbyManager.setLobbyState(lobbyId, 'waiting');
            broadcast(lobbyId, { type: 'round-ended', scores: msg.scores });
          }
          break;
        }

        case 'signal': {
          // WebRTC relay: forward to target peer
          const target = msg.target as string;
          for (const [targetWs, targetConn] of clients) {
            if (targetConn.username === target && targetConn.lobbyId === conn.lobbyId) {
              send(targetWs, { type: 'signal', from: conn.username, data: msg.data });
              break;
            }
          }
          break;
        }

        case 'new-discovery': {
          if (conn.lobbyId) {
            broadcast(conn.lobbyId, {
              type: 'new-discovery',
              from: conn.username,
              discovery: msg.discovery,
            }, ws);
          }
          break;
        }
      }
    });

    ws.on('close', () => {
      const { username, lobbyId } = conn;
      if (lobbyId && username) {
        broadcast(lobbyId, { type: 'player-left', username }, ws);
        lobbyManager.leaveLobby(lobbyId, username);
      }
      clients.delete(ws);
    });
  });

  return lobbyManager;
}
