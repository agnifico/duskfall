// Cast shadows: a soft ellipse at an object's ground point. Each sprite can tune its own (map editor, Tune);
// these are the defaults. Offsets and radii are in the sprite's drawn width.

import type { Sprite } from '../content';

export interface ShadowDefaults {
  sw: number;
  sh: number;
  so: number;
}
export const SHADOW: ShadowDefaults = { sw: 0.42, sh: 0.15, so: 0.32 };
export const PLAYER_SHADOW: ShadowDefaults = { sw: 0.5, sh: 0.17, so: 0.3 };

export interface Shadow {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  o: number;
}

/** The shadow of a sprite drawn w wide whose ground point is (gx, gy). */
export function shadowOf(sp: Sprite, gx: number, gy: number, w: number, d: ShadowDefaults = SHADOW): Shadow {
  return {
    cx: gx + (sp.sx ?? 0) * w,
    cy: gy - 1 + (sp.sy ?? 0) * w,
    rx: (sp.sw ?? d.sw) * w,
    ry: (sp.sh ?? d.sh) * w,
    o: sp.so ?? d.so,
  };
}
