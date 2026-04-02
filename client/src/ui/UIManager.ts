export class UIManager {
  private root: HTMLElement;
  private screens: Map<string, HTMLElement> = new Map();

  constructor() {
    this.root = document.getElementById('ui-root')!;
  }

  register(name: string, el: HTMLElement): void {
    el.style.display = 'none';
    this.screens.set(name, el);
    this.root.appendChild(el);
  }

  show(name: string): void {
    const el = this.screens.get(name);
    if (el) el.style.display = '';
  }

  hide(name: string): void {
    const el = this.screens.get(name);
    if (el) el.style.display = 'none';
  }

  hideAll(): void {
    for (const el of this.screens.values()) {
      el.style.display = 'none';
    }
  }
}
