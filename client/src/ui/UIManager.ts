export class UIManager {
  private root: HTMLElement;
  private screens: Map<string, { el: HTMLElement; originalDisplay: string }> = new Map();

  constructor() {
    this.root = document.getElementById('ui-root')!;
  }

  register(name: string, el: HTMLElement): void {
    const originalDisplay = el.style.display || 'block';
    el.style.display = 'none';
    this.screens.set(name, { el, originalDisplay });
    this.root.appendChild(el);
  }

  show(name: string): void {
    const entry = this.screens.get(name);
    if (entry) entry.el.style.display = entry.originalDisplay;
  }

  hide(name: string): void {
    const entry = this.screens.get(name);
    if (entry) entry.el.style.display = 'none';
  }

  hideAll(): void {
    for (const entry of this.screens.values()) {
      entry.el.style.display = 'none';
    }
  }
}
