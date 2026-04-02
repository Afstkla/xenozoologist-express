import Peer, { DataConnection } from 'peerjs';
import type { HostMessage, PeerMessage, PlayerState } from './Protocol';

type MessageCallback = (username: string, msg: PeerMessage) => void;
type JoinCallback = (username: string) => void;
type LeaveCallback = (username: string) => void;

export class GameHost {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private peerStates: Map<string, PlayerState> = new Map();

  private messageCallbacks: MessageCallback[] = [];
  private joinCallbacks: JoinCallback[] = [];
  private leaveCallbacks: LeaveCallback[] = [];

  start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer();

      this.peer.on('open', (id) => {
        resolve(id);
      });

      this.peer.on('error', (err) => {
        reject(err);
      });

      this.peer.on('connection', (conn) => {
        this.handleConnection(conn);
      });
    });
  }

  private handleConnection(conn: DataConnection): void {
    conn.on('open', () => {
      const username = (conn.metadata as { username?: string })?.username ?? conn.peer;
      this.connections.set(username, conn);

      for (const cb of this.joinCallbacks) {
        cb(username);
      }

      conn.on('data', (raw) => {
        try {
          const msg = raw as PeerMessage;
          if (msg.type === 'player-input') {
            this.peerStates.set(username, {
              username,
              position: msg.position,
              yaw: msg.yaw,
              scanning: msg.scanning,
            });
          }
          for (const cb of this.messageCallbacks) {
            cb(username, msg);
          }
        } catch {
          // ignore
        }
      });

      conn.on('close', () => {
        this.connections.delete(username);
        this.peerStates.delete(username);
        for (const cb of this.leaveCallbacks) {
          cb(username);
        }
      });

      conn.on('error', () => {
        this.connections.delete(username);
        this.peerStates.delete(username);
        for (const cb of this.leaveCallbacks) {
          cb(username);
        }
      });
    });
  }

  onMessage(cb: MessageCallback): void {
    this.messageCallbacks.push(cb);
  }

  onJoin(cb: JoinCallback): void {
    this.joinCallbacks.push(cb);
  }

  onLeave(cb: LeaveCallback): void {
    this.leaveCallbacks.push(cb);
  }

  broadcast(msg: HostMessage): void {
    const data = JSON.stringify(msg);
    for (const conn of this.connections.values()) {
      if (conn.open) {
        conn.send(data);
      }
    }
  }

  sendTo(username: string, msg: HostMessage): void {
    const conn = this.connections.get(username);
    if (conn && conn.open) {
      conn.send(JSON.stringify(msg));
    }
  }

  getPeerStates(): PlayerState[] {
    return Array.from(this.peerStates.values());
  }

  getConnectedCount(): number {
    return this.connections.size;
  }

  destroy(): void {
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
    this.peerStates.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
