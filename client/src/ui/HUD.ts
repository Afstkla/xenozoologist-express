import { Challenge } from '../network/Protocol';

interface FeedEntry {
  el: HTMLElement;
  createdAt: number;
}

export class HUD {
  readonly el: HTMLElement;

  private timerEl: HTMLElement;
  private scoreEl: HTMLElement;
  private feedEl: HTMLElement;
  private challengesEl: HTMLElement;
  private feedEntries: FeedEntry[] = [];

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      fontFamily: 'monospace',
      zIndex: '50',
    });

    // ── Timer (top center) ────────────────────────────────────────────
    this.timerEl = document.createElement('div');
    this.timerEl.textContent = '5:00';
    Object.assign(this.timerEl.style, {
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '24px',
      color: '#7af5ca',
      textShadow: '0 0 12px rgba(122,245,202,0.7)',
      fontWeight: 'bold',
      letterSpacing: '0.05em',
    });

    // ── Score (top right) ─────────────────────────────────────────────
    this.scoreEl = document.createElement('div');
    this.scoreEl.textContent = '0 pts';
    Object.assign(this.scoreEl.style, {
      position: 'absolute',
      top: '18px',
      right: '20px',
      fontSize: '18px',
      color: '#fff',
    });

    // ── Challenges (below timer) ──────────────────────────────────────
    this.challengesEl = document.createElement('div');
    Object.assign(this.challengesEl.style, {
      position: 'absolute',
      top: '56px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '13px',
      color: '#ffaa00',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      minWidth: '200px',
    });

    // ── Feed (bottom left) ────────────────────────────────────────────
    this.feedEl = document.createElement('div');
    Object.assign(this.feedEl.style, {
      position: 'absolute',
      bottom: '20px',
      left: '20px',
      fontSize: '12px',
      color: '#ccc',
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: '3px',
      maxWidth: '320px',
    });

    this.el.appendChild(this.timerEl);
    this.el.appendChild(this.scoreEl);
    this.el.appendChild(this.challengesEl);
    this.el.appendChild(this.feedEl);
  }

  updateTimer(seconds: number): void {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    this.timerEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    if (seconds < 30) {
      this.timerEl.style.color = '#ff4444';
      this.timerEl.style.textShadow = '0 0 12px rgba(255,68,68,0.7)';
    } else {
      this.timerEl.style.color = '#7af5ca';
      this.timerEl.style.textShadow = '0 0 12px rgba(122,245,202,0.7)';
    }
  }

  updateScore(score: number): void {
    this.scoreEl.textContent = `${score} pts`;
  }

  addFeedMessage(msg: string): void {
    // Trim to max 5
    while (this.feedEntries.length >= 5) {
      const oldest = this.feedEntries.shift()!;
      oldest.el.remove();
    }

    const msgEl = document.createElement('div');
    msgEl.textContent = msg;
    Object.assign(msgEl.style, {
      opacity: '1',
      transition: 'opacity 0.3s',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    });

    this.feedEntries.push({ el: msgEl, createdAt: Date.now() });
    this.feedEl.appendChild(msgEl);

    // Recompute opacity for all entries: newest = 1, oldest = 0.2
    this._updateFeedOpacity();

    // Fade out after 4 seconds
    setTimeout(() => {
      msgEl.style.opacity = '0';
      setTimeout(() => {
        msgEl.remove();
        this.feedEntries = this.feedEntries.filter(e => e.el !== msgEl);
        this._updateFeedOpacity();
      }, 300);
    }, 4000);
  }

  private _updateFeedOpacity(): void {
    const count = this.feedEntries.length;
    this.feedEntries.forEach((entry, i) => {
      // newest entry is last in array; give it full opacity
      const fraction = count <= 1 ? 1 : i / (count - 1);
      const opacity = 0.2 + fraction * 0.8;
      entry.el.style.opacity = opacity.toFixed(2);
    });
  }

  showChallenges(challenges: Challenge[], completed: Map<string, string>): void {
    this.challengesEl.innerHTML = '';
    for (const challenge of challenges) {
      const row = document.createElement('div');
      const winner = completed.get(challenge.id);
      const isDone = winner !== undefined;

      Object.assign(row.style, {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: isDone ? '#888' : '#ffaa00',
        textDecoration: isDone ? 'line-through' : 'none',
      });

      const desc = isDone
        ? `${challenge.description} (${winner})`
        : `${challenge.description} [+${challenge.bonusPoints}]`;
      row.textContent = desc;
      this.challengesEl.appendChild(row);
    }
  }
}
