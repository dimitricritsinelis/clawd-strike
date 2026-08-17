/**
 * BuffTextHud — displays active buff effects as colored text lines
 * above the ammo HUD in the bottom-right corner.
 *
 * Each active buff shows its effect description (e.g. "+20% Speed")
 * colored by the buff's vignette color. Buffs stack vertically, bottom-up.
 */

import {
  type BuffType,
  BUFF_DEFINITIONS,
  BUFF_TYPES,
} from "../buffs/BuffTypes";
import type { ActiveBuffSnapshot } from "../buffs/BuffManager";
import type { GameplayTuning } from "../tuning/gameplayTuning";
import { createBuffDisplayCopy } from "./BuffDisplayCopy";

const FONT_FAMILY = '"Segoe UI", Tahoma, Verdana, sans-serif';

/** Canonical display order (top → bottom) */
const DISPLAY_ORDER: readonly BuffType[] = BUFF_TYPES;

type TextEntry = {
  el: HTMLDivElement;
  type: BuffType;
};

/**
 * Rallying Cry is a presentation state, not a synthetic stack of effects.
 * The active snapshots remain the authority for which effect text is shown.
 */
export function getDisplayedBuffTypes(
  buffs: readonly ActiveBuffSnapshot[],
): BuffType[] {
  const activeTypes = new Set(buffs.map((buff) => buff.type));
  return DISPLAY_ORDER.filter((type) => activeTypes.has(type));
}

export class BuffTextHud {
  private readonly root: HTMLDivElement;
  private readonly effectText: Readonly<Record<BuffType, string>>;
  private readonly entries = new Map<BuffType, TextEntry>();
  private visible = true;

  constructor(mountEl: HTMLElement, tuning: GameplayTuning) {
    this.effectText = createBuffDisplayCopy(tuning).compactEffects;
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "absolute",
      bottom: "90px",
      right: "22px",
      zIndex: "22",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
      gap: "3px",
      pointerEvents: "none",
      maxWidth: "150px",
    } satisfies Partial<CSSStyleDeclaration>);
    mountEl.append(this.root);
  }

  setVisible(visible: boolean): void {
    if (visible === this.visible) return;
    this.visible = visible;
    this.root.style.display = visible ? "flex" : "none";
  }

  update(buffs: ActiveBuffSnapshot[], _rallyingCryActive: boolean): void {
    // Rallying Cry empowers one of the real active snapshots. Never fabricate
    // the other three effects merely because its presentation state is active.
    const activeTypes = new Set(getDisplayedBuffTypes(buffs));

    // Add entries for newly active buffs (in canonical order)
    for (const type of DISPLAY_ORDER) {
      if (!activeTypes.has(type)) continue;
      if (this.entries.has(type)) continue;

      const def = BUFF_DEFINITIONS[type];
      const el = document.createElement("div");
      Object.assign(el.style, {
        fontFamily: FONT_FAMILY,
        fontSize: "18px",
        fontWeight: "700",
        letterSpacing: "0.03em",
        color: `rgb(${def.vignetteColor})`,
        textShadow: `0 1px 6px rgba(0, 0, 0, 0.9), 0 0 10px rgba(${def.vignetteColor}, 0.4)`,
        textAlign: "right",
        whiteSpace: "nowrap",
        lineHeight: "1.3",
      } satisfies Partial<CSSStyleDeclaration>);
      el.textContent = this.effectText[type];

      this.entries.set(type, { el, type });
    }

    // Remove entries for expired buffs
    for (const [type, entry] of this.entries) {
      if (!activeTypes.has(type)) {
        entry.el.remove();
        this.entries.delete(type);
      }
    }

    // Rebuild DOM order to match canonical display order
    for (const type of DISPLAY_ORDER) {
      const entry = this.entries.get(type);
      if (entry) {
        this.root.append(entry.el);
      }
    }
  }

  clear(): void {
    for (const [, entry] of this.entries) {
      entry.el.remove();
    }
    this.entries.clear();
  }

  dispose(): void {
    this.clear();
    this.root.remove();
  }
}
