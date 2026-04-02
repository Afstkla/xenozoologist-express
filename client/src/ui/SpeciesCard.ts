import { ScanResult } from '../game/Scanner';

const RARITY_LABELS: Array<{ max: number; label: string; color: string }> = [
  { max: 0.2, label: 'Common', color: '#aaa' },
  { max: 0.4, label: 'Uncommon', color: '#5cb3ff' },
  { max: 0.6, label: 'Rare', color: '#c77dff' },
  { max: 0.8, label: 'Very Rare', color: '#ffaa00' },
  { max: Infinity, label: 'Legendary', color: '#ff4444' },
];

function getRarityInfo(rarity: number): { label: string; color: string } {
  for (const entry of RARITY_LABELS) {
    if (rarity < entry.max) {
      return { label: entry.label, color: entry.color };
    }
  }
  return { label: 'Legendary', color: '#ff4444' };
}

export class SpeciesCard {
  private containerEl: HTMLDivElement;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.containerEl = document.createElement('div');
    Object.assign(this.containerEl.style, {
      position: 'fixed',
      right: '24px',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '280px',
      background: 'rgba(10, 10, 15, 0.90)',
      border: '1px solid #7af5ca',
      borderRadius: '12px',
      padding: '16px',
      fontFamily: 'monospace',
      color: '#e0ffe8',
      zIndex: '20',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.3s ease',
      boxSizing: 'border-box',
    });

    const uiRoot = document.getElementById('ui-root') ?? document.body;
    uiRoot.appendChild(this.containerEl);
  }

  show(result: ScanResult): void {
    const { species, isNewToWorld, points } = result;
    const def = species.definition;
    const rarityInfo = getRarityInfo(species.rarity);

    // Clear any pending hide
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Build content
    const headerText = isNewToWorld ? 'NEW DISCOVERY' : 'SPECIES SCAN';
    const headerColor = isNewToWorld ? '#7af5ca' : '#5cb3ff';

    this.containerEl.innerHTML = `
      <div style="
        font-size: 11px;
        letter-spacing: 2px;
        color: ${headerColor};
        margin-bottom: 8px;
        font-weight: bold;
      ">${headerText}</div>

      <div style="
        font-size: 15px;
        font-style: italic;
        color: #ffffff;
        margin-bottom: 4px;
      ">${species.name}</div>

      <div style="
        font-size: 10px;
        color: #7af5ca;
        margin-bottom: 12px;
        letter-spacing: 1px;
      ">ID: ${species.id}</div>

      <div style="
        font-size: 11px;
        color: #aaa;
        line-height: 1.8;
        margin-bottom: 12px;
      ">
        <div><span style="color:#7af5ca">BODY</span>   ${def.bodyType}</div>
        <div><span style="color:#7af5ca">BEHAV</span>  ${def.behavior}</div>
        <div><span style="color:#7af5ca">HEAD</span>   ${def.headType}</div>
        <div><span style="color:#7af5ca">LIMBS</span>  ${def.limbCount}</div>
      </div>

      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid rgba(122, 245, 202, 0.2);
        padding-top: 10px;
      ">
        <span style="
          font-size: 11px;
          color: ${rarityInfo.color};
          letter-spacing: 1px;
        ">${rarityInfo.label.toUpperCase()}</span>

        <span style="
          font-size: 14px;
          font-weight: bold;
          color: ${isNewToWorld ? '#7af5ca' : '#aaa'};
        ">+${points} pts</span>
      </div>
    `;

    // Fade in
    this.containerEl.style.opacity = '1';

    // Auto-hide after 4 seconds
    this.hideTimeout = setTimeout(() => {
      this.containerEl.style.opacity = '0';
      this.hideTimeout = null;
    }, 4000);
  }

  dispose(): void {
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
    }
    this.containerEl.remove();
  }
}
