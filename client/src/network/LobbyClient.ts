type MessageHandler = (data: unknown) => void;

export class LobbyClient {
  private ws: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private url: string;

  constructor() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.url = `${protocol}//${location.host}/ws`;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, ...rest } = msg;
          const handlers = this.handlers.get(type) ?? [];
          for (const handler of handlers) {
            handler(rest);
          }
        } catch {
          // ignore malformed messages
        }
      };
    });
  }

  on(type: string, callback: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(callback);
  }

  send(msg: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  setUsername(username: string): void {
    this.send({ type: 'set-username', username });
  }

  listLobbies(): void {
    this.send({ type: 'list-lobbies' });
  }

  createLobby(name: string): void {
    this.send({ type: 'create-lobby', name });
  }

  joinLobby(lobbyId: string): void {
    this.send({ type: 'join-lobby', lobbyId });
  }

  leaveLobby(): void {
    this.send({ type: 'leave-lobby' });
  }

  setHostPeerId(peerId: string): void {
    this.send({ type: 'set-host-peer-id', peerId });
  }

  startGame(seed: number): void {
    this.send({ type: 'start-game', seed });
  }

  endRound(results: unknown[]): void {
    this.send({ type: 'end-round', results });
  }

  broadcastDiscovery(species: unknown, discoverer: string): void {
    this.send({ type: 'broadcast-discovery', species, discoverer });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
