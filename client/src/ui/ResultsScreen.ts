import { RoundResult } from '../network/Protocol';

export class ResultsScreen {
  readonly el: HTMLElement;

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

  show(results: RoundResult[], onNext: () => void): void {
    this.el.innerHTML = '';

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      maxWidth: '480px',
      width: '100%',
      padding: '40px 32px',
      boxSizing: 'border-box',
      textAlign: 'center',
    });

    const title = document.createElement('h2');
    title.textContent = 'Expedition Complete';
    Object.assign(title.style, {
      fontSize: '26px',
      color: '#7af5ca',
      margin: '0 0 8px 0',
      fontFamily: 'monospace',
      letterSpacing: '0.02em',
    });

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      height: '1px',
      background: 'rgba(122,245,202,0.2)',
      margin: '16px 0 24px',
    });

    panel.appendChild(title);
    panel.appendChild(divider);

    // Sort by score descending
    const sorted = [...results].sort((a, b) => b.score - a.score);

    sorted.forEach((result, i) => {
      const row = document.createElement('div');
      const isFirst = i === 0;
      Object.assign(row.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        marginBottom: '8px',
        borderRadius: '4px',
        background: isFirst ? 'rgba(122,245,202,0.1)' : 'rgba(255,255,255,0.04)',
        border: isFirst ? '1px solid rgba(122,245,202,0.35)' : '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'monospace',
      });

      const leftCol = document.createElement('div');
      Object.assign(leftCol.style, { textAlign: 'left' });

      const rankName = document.createElement('div');
      Object.assign(rankName.style, {
        fontSize: '15px',
        color: isFirst ? '#7af5ca' : '#ddd',
        fontWeight: isFirst ? 'bold' : 'normal',
        marginBottom: '2px',
      });
      rankName.textContent = `#${i + 1}  ${result.player}`;

      const discoveries = document.createElement('div');
      Object.assign(discoveries.style, {
        fontSize: '12px',
        color: '#888',
      });
      const newLabel = result.newDiscoveries > 0
        ? ` · ${result.newDiscoveries} new`
        : '';
      discoveries.textContent = `${result.discoveries} species cataloged${newLabel}`;

      leftCol.appendChild(rankName);
      leftCol.appendChild(discoveries);

      const scoreEl = document.createElement('div');
      Object.assign(scoreEl.style, {
        fontSize: '20px',
        color: isFirst ? '#7af5ca' : '#ccc',
        fontWeight: 'bold',
      });
      scoreEl.textContent = `${result.score}`;

      row.appendChild(leftCol);
      row.appendChild(scoreEl);
      panel.appendChild(row);
    });

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next Expedition';
    Object.assign(nextBtn.style, {
      marginTop: '24px',
      padding: '12px 32px',
      background: '#7af5ca',
      color: '#0a1a14',
      border: 'none',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      letterSpacing: '0.03em',
    });
    nextBtn.addEventListener('mouseover', () => { nextBtn.style.opacity = '0.85'; });
    nextBtn.addEventListener('mouseout', () => { nextBtn.style.opacity = '1'; });
    nextBtn.addEventListener('click', () => onNext());

    panel.appendChild(nextBtn);
    this.el.appendChild(panel);
  }
}
