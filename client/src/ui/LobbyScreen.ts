export interface LobbyCallbacks {
  onSetUsername: (name: string) => void;
  onCreateLobby: () => void;
  onJoinLobby: (id: string) => void;
  onStartGame: () => void;
  onRefresh: () => void;
}

export class LobbyScreen {
  readonly el: HTMLElement;

  private menuView: HTMLElement;
  private lobbyView: HTMLElement;
  private usernameInput: HTMLInputElement;
  private lobbyListEl: HTMLElement;
  private playersListEl: HTMLElement;
  private launchBtn: HTMLElement;
  private waitingText: HTMLElement;

  constructor(callbacks: LobbyCallbacks) {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      inset: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(10,10,15,0.95)',
      fontFamily: 'monospace',
      color: '#fff',
      zIndex: '100',
    });

    // ── Menu View ──────────────────────────────────────────────────────
    this.menuView = document.createElement('div');
    Object.assign(this.menuView.style, {
      maxWidth: '500px',
      width: '100%',
      padding: '40px 32px',
      boxSizing: 'border-box',
      textAlign: 'center',
    });

    const title = document.createElement('h1');
    title.textContent = 'Xenozoologist Express';
    Object.assign(title.style, {
      fontSize: '28px',
      color: '#7af5ca',
      margin: '0 0 8px 0',
      fontFamily: 'monospace',
      fontWeight: 'bold',
      letterSpacing: '0.02em',
    });

    const subtitle = document.createElement('p');
    subtitle.textContent = 'Explore alien worlds. Catalog the unknown.';
    Object.assign(subtitle.style, {
      fontSize: '13px',
      color: '#888',
      margin: '0 0 32px 0',
      fontFamily: 'monospace',
    });

    this.usernameInput = document.createElement('input');
    this.usernameInput.type = 'text';
    this.usernameInput.placeholder = 'Enter username…';
    Object.assign(this.usernameInput.style, {
      display: 'block',
      width: '100%',
      padding: '10px 14px',
      marginBottom: '24px',
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(122,245,202,0.3)',
      borderRadius: '4px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '14px',
      textAlign: 'center',
      boxSizing: 'border-box',
      outline: 'none',
    });
    this.usernameInput.addEventListener('blur', () => {
      const v = this.usernameInput.value.trim();
      if (v) callbacks.onSetUsername(v);
    });
    this.usernameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const v = this.usernameInput.value.trim();
        if (v) callbacks.onSetUsername(v);
      }
    });

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px',
    });

    const createBtn = this._btn('Create Lobby', '#7af5ca', '#0a1a14');
    createBtn.style.flex = '1';
    createBtn.addEventListener('click', () => callbacks.onCreateLobby());

    const refreshBtn = this._btn('Refresh', 'rgba(255,255,255,0.1)', '#ccc');
    refreshBtn.style.flex = '0 0 auto';
    refreshBtn.style.border = '1px solid rgba(255,255,255,0.2)';
    refreshBtn.addEventListener('click', () => callbacks.onRefresh());

    btnRow.appendChild(createBtn);
    btnRow.appendChild(refreshBtn);

    const lobbyListLabel = document.createElement('div');
    lobbyListLabel.textContent = 'Open Lobbies';
    Object.assign(lobbyListLabel.style, {
      fontSize: '11px',
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: '8px',
      textAlign: 'left',
    });

    this.lobbyListEl = document.createElement('div');
    Object.assign(this.lobbyListEl.style, {
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '4px',
      maxHeight: '240px',
      overflowY: 'auto',
      background: 'rgba(255,255,255,0.03)',
    });
    const emptyMsg = document.createElement('div');
    emptyMsg.textContent = 'No lobbies found.';
    Object.assign(emptyMsg.style, {
      padding: '16px',
      color: '#555',
      fontSize: '13px',
      textAlign: 'center',
    });
    this.lobbyListEl.appendChild(emptyMsg);

    this.menuView.appendChild(title);
    this.menuView.appendChild(subtitle);
    this.menuView.appendChild(this.usernameInput);
    this.menuView.appendChild(btnRow);
    this.menuView.appendChild(lobbyListLabel);
    this.menuView.appendChild(this.lobbyListEl);

    // ── Lobby View ─────────────────────────────────────────────────────
    this.lobbyView = document.createElement('div');
    Object.assign(this.lobbyView.style, {
      maxWidth: '500px',
      width: '100%',
      padding: '40px 32px',
      boxSizing: 'border-box',
      textAlign: 'center',
      display: 'none',
    });

    const lobbyTitle = document.createElement('h2');
    lobbyTitle.textContent = 'Expedition Lobby';
    Object.assign(lobbyTitle.style, {
      fontSize: '22px',
      color: '#7af5ca',
      margin: '0 0 24px 0',
      fontFamily: 'monospace',
    });

    const playersLabel = document.createElement('div');
    playersLabel.textContent = 'Crew';
    Object.assign(playersLabel.style, {
      fontSize: '11px',
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: '8px',
      textAlign: 'left',
    });

    this.playersListEl = document.createElement('div');
    Object.assign(this.playersListEl.style, {
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '4px',
      marginBottom: '24px',
      background: 'rgba(255,255,255,0.03)',
      minHeight: '60px',
    });

    this.launchBtn = this._btn('Launch Expedition', '#7af5ca', '#0a1a14');
    Object.assign(this.launchBtn.style, {
      width: '100%',
      marginBottom: '12px',
      display: 'none',
    });
    this.launchBtn.addEventListener('click', () => callbacks.onStartGame());

    this.waitingText = document.createElement('div');
    this.waitingText.textContent = 'Waiting for host to start…';
    Object.assign(this.waitingText.style, {
      fontSize: '13px',
      color: '#888',
      fontFamily: 'monospace',
    });

    this.lobbyView.appendChild(lobbyTitle);
    this.lobbyView.appendChild(playersLabel);
    this.lobbyView.appendChild(this.playersListEl);
    this.lobbyView.appendChild(this.launchBtn);
    this.lobbyView.appendChild(this.waitingText);

    this.el.appendChild(this.menuView);
    this.el.appendChild(this.lobbyView);

    // Store ref for callbacks.onJoinLobby usage in updateLobbyList
    (this as any)._joinCallback = callbacks.onJoinLobby;
  }

  private _btn(label: string, bg: string, color: string): HTMLElement {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      padding: '10px 18px',
      background: bg,
      color,
      border: 'none',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '13px',
      fontWeight: 'bold',
      cursor: 'pointer',
      letterSpacing: '0.02em',
    });
    btn.addEventListener('mouseover', () => { btn.style.opacity = '0.85'; });
    btn.addEventListener('mouseout', () => { btn.style.opacity = '1'; });
    return btn;
  }

  updateLobbyList(lobbies: Array<{ id: string; host: string; playerCount: number }>): void {
    this.lobbyListEl.innerHTML = '';
    if (lobbies.length === 0) {
      const msg = document.createElement('div');
      msg.textContent = 'No lobbies found.';
      Object.assign(msg.style, {
        padding: '16px',
        color: '#555',
        fontSize: '13px',
        textAlign: 'center',
      });
      this.lobbyListEl.appendChild(msg);
      return;
    }

    for (const lobby of lobbies) {
      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 14px',
        cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'background 0.1s',
      });
      row.addEventListener('mouseover', () => { row.style.background = 'rgba(122,245,202,0.08)'; });
      row.addEventListener('mouseout', () => { row.style.background = ''; });
      row.addEventListener('click', () => {
        (this as any)._joinCallback(lobby.id);
      });

      const hostName = document.createElement('span');
      hostName.textContent = lobby.host;
      Object.assign(hostName.style, { fontSize: '14px', color: '#ccc' });

      const playerCount = document.createElement('span');
      playerCount.textContent = `${lobby.playerCount} player${lobby.playerCount !== 1 ? 's' : ''}`;
      Object.assign(playerCount.style, { fontSize: '12px', color: '#7af5ca' });

      row.appendChild(hostName);
      row.appendChild(playerCount);
      this.lobbyListEl.appendChild(row);
    }
  }

  showLobbyView(players: string[], isHost: boolean): void {
    this.menuView.style.display = 'none';
    this.lobbyView.style.display = '';
    this.updatePlayers(players);
    this.launchBtn.style.display = isHost ? '' : 'none';
    this.waitingText.style.display = isHost ? 'none' : '';
  }

  updatePlayers(players: string[]): void {
    this.playersListEl.innerHTML = '';
    players.forEach((name, i) => {
      const row = document.createElement('div');
      Object.assign(row.style, {
        padding: '10px 14px',
        fontSize: '14px',
        fontFamily: 'monospace',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        borderBottom: i < players.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
        background: i === 0 ? 'rgba(122,245,202,0.08)' : '',
        color: i === 0 ? '#7af5ca' : '#ccc',
      });

      if (i === 0) {
        const crown = document.createElement('span');
        crown.textContent = '👑';
        crown.style.fontSize = '14px';
        row.appendChild(crown);
      }

      const nameEl = document.createElement('span');
      nameEl.textContent = name;
      row.appendChild(nameEl);

      this.playersListEl.appendChild(row);
    });
  }

  showMenuView(): void {
    this.lobbyView.style.display = 'none';
    this.menuView.style.display = '';
  }

  getUsername(): string {
    return this.usernameInput.value.trim();
  }
}
