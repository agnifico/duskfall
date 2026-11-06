// The colour themes. Their colours live in px.css; this list names them and holds the few colours
// the hex field draws in code (SVG fills can't read CSS variables).

export interface Theme {
  id: string;
  name: string;
  fog: string; // unexplored hexes
}

export const THEMES: Theme[] = [
  { id: 'meadow', name: 'Meadow', fog: '#e9eef0' },
  { id: 'harvest', name: 'Harvest', fog: '#efe0c2' },
  { id: 'arcade', name: 'Arcade', fog: '#e3e8f6' },
  { id: 'forest', name: 'Forest', fog: '#22302e' },
];

export const themeOf = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0];

export function applyTheme(id: string): void {
  document.documentElement.dataset.theme = themeOf(id).id;
}

export function nextTheme(id: string): string {
  const i = THEMES.findIndex((t) => t.id === id);
  return THEMES[(i + 1) % THEMES.length].id;
}
