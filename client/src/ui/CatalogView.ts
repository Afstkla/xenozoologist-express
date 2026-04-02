interface CatalogEntry {
  id: string;
  name: string;
  rarity: string;
  discoverer: string;
  traits: string[];
}

const RARITY_COLORS: Record<string, string> = {
  Common: '#aaa',
  Uncommon: '#5cb3ff',
  Rare: '#c77dff',
  'Very Rare': '#ffaa00',
  Legendary: '#ff4444',
};

function rarityColor(rarity: string): string {
  return RARITY_COLORS[rarity] ?? '#aaa';
}

export class CatalogView {
  readonly el: HTMLElement;
  private closeCallback: (() => void) | null = null;

  constructor() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      inset: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(10,10,15,0.92)',
      fontFamily: 'monospace',
      color: '#fff',
      zIndex: '200',
    });
  }

  onClose(cb: () => void): void {
    this.closeCallback = cb;
  }

  async load(apiBase = ''): Promise<void> {
    this.el.innerHTML = '';

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      maxWidth: '600px',
      width: '100%',
      maxHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10,10,15,0.98)',
      border: '1px solid rgba(122,245,202,0.2)',
      borderRadius: '6px',
      overflow: 'hidden',
      boxSizing: 'border-box',
    });

    // Header
    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '20px 24px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      flexShrink: '0',
    });

    const titleEl = document.createElement('h2');
    titleEl.textContent = 'Galactic Encyclopedia';
    Object.assign(titleEl.style, {
      margin: '0',
      fontSize: '20px',
      color: '#7af5ca',
      fontFamily: 'monospace',
      letterSpacing: '0.02em',
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      background: 'none',
      border: 'none',
      color: '#888',
      fontSize: '18px',
      cursor: 'pointer',
      padding: '4px 8px',
      fontFamily: 'monospace',
      lineHeight: '1',
    });
    closeBtn.addEventListener('mouseover', () => { closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseout', () => { closeBtn.style.color = '#888'; });
    closeBtn.addEventListener('click', () => {
      if (this.closeCallback) this.closeCallback();
    });

    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    // Count row
    const countRow = document.createElement('div');
    Object.assign(countRow.style, {
      padding: '10px 24px',
      fontSize: '12px',
      color: '#888',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      flexShrink: '0',
    });
    countRow.textContent = 'Loading…';

    // Scrollable list
    const listEl = document.createElement('div');
    Object.assign(listEl.style, {
      overflowY: 'auto',
      flex: '1',
      padding: '8px 0',
    });

    panel.appendChild(header);
    panel.appendChild(countRow);
    panel.appendChild(listEl);
    this.el.appendChild(panel);

    // Fetch data
    let entries: CatalogEntry[] = [];
    try {
      const res = await fetch(`${apiBase}/api/catalog?limit=100`);
      if (res.ok) {
        const data = await res.json();
        entries = Array.isArray(data) ? data : (data.entries ?? []);
      }
    } catch {
      // silently handle fetch error
    }

    countRow.textContent = `${entries.length} species discovered`;

    if (entries.length === 0) {
      const empty = document.createElement('div');
      empty.textContent = 'No species cataloged yet.';
      Object.assign(empty.style, {
        padding: '24px',
        color: '#555',
        textAlign: 'center',
        fontSize: '13px',
      });
      listEl.appendChild(empty);
      return;
    }

    for (const entry of entries) {
      const color = rarityColor(entry.rarity);

      const row = document.createElement('div');
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'flex-start',
        padding: '10px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        gap: '12px',
      });

      const colorBar = document.createElement('div');
      Object.assign(colorBar.style, {
        width: '3px',
        borderRadius: '2px',
        alignSelf: 'stretch',
        flexShrink: '0',
        background: color,
        minHeight: '36px',
      });

      const info = document.createElement('div');
      Object.assign(info.style, { flex: '1', minWidth: '0' });

      const nameLine = document.createElement('div');
      Object.assign(nameLine.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '8px',
        marginBottom: '3px',
      });

      const nameEl = document.createElement('span');
      nameEl.textContent = entry.name;
      Object.assign(nameEl.style, {
        fontStyle: 'italic',
        fontSize: '14px',
        color: '#eee',
        fontFamily: 'monospace',
      });

      const rarityEl = document.createElement('span');
      rarityEl.textContent = entry.rarity;
      Object.assign(rarityEl.style, {
        fontSize: '11px',
        color,
        fontFamily: 'monospace',
        flexShrink: '0',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      });

      nameLine.appendChild(nameEl);
      nameLine.appendChild(rarityEl);

      const metaLine = document.createElement('div');
      Object.assign(metaLine.style, {
        fontSize: '11px',
        color: '#666',
        fontFamily: 'monospace',
      });

      const parts: string[] = [];
      if (entry.discoverer) parts.push(`discovered by ${entry.discoverer}`);
      if (entry.traits && entry.traits.length > 0) parts.push(entry.traits.join(', '));
      metaLine.textContent = parts.join('  ·  ');

      info.appendChild(nameLine);
      info.appendChild(metaLine);

      row.appendChild(colorBar);
      row.appendChild(info);
      listEl.appendChild(row);
    }
  }
}
