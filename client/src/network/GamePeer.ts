import Peer, { DataConnection } from 'peerjs';
import type { HostMessage, PeerMessage } from './Protocol';

type MessageCallback = (msg: HostMessage) => void;
type DisconnectedCallback = () => void;

export class GamePeer {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;

  private messageCallbacks: MessageCallback[] = [];
  private disconnectedCallbacks: DisconnectedCallback[] = [];

  connect(hostPeerId: string, username: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.peer = new Peer();

      this.peer.on('open', () => {
        this.conn = this.peer!.connect(hostPeerId, {
          metadata: { username },
          reliable: true,
        });

        this.conn.on('open', () => {
          resolve();
        });

        this.conn.on('data', (raw) => {
          try {
            const msg = (typeof raw === 'string' ? JSON.parse(raw) : raw) as HostMessage;
            for (const cb of this.messageCallbacks) {
              cb(msg);
            }
          } catch {
            // ignore
          }
        });

        this.conn.on('close', () => {
          for (const cb of this.disconnectedCallbacks) {
            cb();
          }
        });

        this.conn.on('error', () => {
          for (const cb of this.disconnectedCallbacks) {
            cb();
          }
        });
      });

      this.peer.on('error', (err) => {
        reject(err);
      });
    });
  }

  onMessage(cb: MessageCallback): void {
    this.messageCallbacks.push(cb);
  }

  onDisconnected(cb: DisconnectedCallback): void {
    this.disconnectedCallbacks.push(cb);
  }

  send(msg: PeerMessage): void {
    if (this.conn && this.conn.open) {
      this.conn.send(JSON.stringify(msg));
    }
  }

  destroy(): void {
    if (this.conn) {
      this.conn.close();
      this.conn = null;
    }
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
