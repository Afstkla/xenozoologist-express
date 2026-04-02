export type GameState = 'menu' | 'lobby' | 'playing' | 'results';

type ChangeCallback = (from: GameState, to: GameState) => void;

export class GameManager {
  private state: GameState = 'menu';
  private changeCallbacks: ChangeCallback[] = [];

  onChange(cb: ChangeCallback): void {
    this.changeCallbacks.push(cb);
  }

  getState(): GameState {
    return this.state;
  }

  transition(to: GameState): void {
    const from = this.state;
    if (from === to) return;
    this.state = to;
    for (const cb of this.changeCallbacks) {
      cb(from, to);
    }
  }
}
