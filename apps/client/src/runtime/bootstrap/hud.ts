import type { HealthHud } from "../ui/HealthHud";
import type { AmmoHud } from "../ui/AmmoHud";
import type { TimerHud } from "../ui/TimerHud";
import type { KillFeed } from "../ui/KillFeed";

export function getAppRoot(): HTMLElement {
  const app = document.querySelector<HTMLElement>("#app");
  if (!app) throw new Error("Missing #app mount root");
  return app;
}

export function createRuntimeRoot(appRoot: HTMLElement): HTMLDivElement {
  const existing = appRoot.querySelector<HTMLDivElement>("#runtime-root");
  if (existing) {
    existing.style.position = "absolute";
    existing.style.inset = "0";
    existing.style.background = "#0b0b0b";
    existing.style.overflow = "hidden";
    existing.style.userSelect = "none";
    existing.style.opacity = "0";
    existing.style.pointerEvents = "none";
    existing.style.willChange = "opacity";
    existing.style.transition = "none";
    return existing;
  }

  const runtimeRoot = document.createElement("div");
  runtimeRoot.id = "runtime-root";
  runtimeRoot.style.position = "absolute";
  runtimeRoot.style.inset = "0";
  runtimeRoot.style.background = "#0b0b0b";
  runtimeRoot.style.overflow = "hidden";
  runtimeRoot.style.userSelect = "none";
  runtimeRoot.style.opacity = "0";
  runtimeRoot.style.pointerEvents = "none";
  runtimeRoot.style.willChange = "opacity";
  runtimeRoot.style.transition = "none";
  appRoot.prepend(runtimeRoot);
  return runtimeRoot;
}

export function createOverlay(root: HTMLElement, style: Partial<CSSStyleDeclaration>): HTMLDivElement {
  const el = document.createElement("div");
  el.style.position = "absolute";
  el.style.maxWidth = "min(90vw, 640px)";
  el.style.display = "none";
  el.style.whiteSpace = "pre-wrap";
  el.style.zIndex = "20";
  Object.assign(el.style, style);
  root.append(el);
  return el;
}

export function createCrosshair(root: HTMLElement): HTMLDivElement {
  const crosshair = document.createElement("div");
  crosshair.style.position = "absolute";
  crosshair.style.left = "50%";
  crosshair.style.top = "50%";
  crosshair.style.width = "18px";
  crosshair.style.height = "18px";
  crosshair.style.transform = "translate(-50%, -50%)";
  crosshair.style.pointerEvents = "none";
  crosshair.style.zIndex = "16";

  const horizontal = document.createElement("div");
  horizontal.style.position = "absolute";
  horizontal.style.left = "0";
  horizontal.style.top = "8px";
  horizontal.style.width = "18px";
  horizontal.style.height = "2px";
  horizontal.style.background = "rgba(13, 23, 38, 0.92)";
  horizontal.style.borderRadius = "1px";
  crosshair.append(horizontal);

  const vertical = document.createElement("div");
  vertical.style.position = "absolute";
  vertical.style.left = "8px";
  vertical.style.top = "0";
  vertical.style.width = "2px";
  vertical.style.height = "18px";
  vertical.style.background = "rgba(13, 23, 38, 0.92)";
  vertical.style.borderRadius = "1px";
  crosshair.append(vertical);

  root.append(crosshair);
  return crosshair;
}

export function configureMobileHud(
  healthHud: HealthHud,
  ammoHud: AmmoHud,
  timerHud: TimerHud,
  killFeed: KillFeed,
): (dt: number, currentHealth: number, currentMag: number) => void {
  // ── PUBG-style compact HUD for iPhone landscape ──────────────
  // Effective viewport: ~667x325 (SE) to ~932x380 (Pro Max)
  // Design: strip away panel chrome, use thin bars + floating text
  // Auto-opacity: 0.45 base, flash to 1.0 on state change for 1.5s

  const MOBILE_BASE_OPACITY = "0.6";
  const MOBILE_FLASH_OPACITY = "1";
  const MOBILE_FLASH_DURATION_S = 1.5;
  let mobileHealthFlashTimer = 0;
  let mobileAmmoFlashTimer = 0;
  let mobilePrevHealth = 100;
  let mobilePrevMag = 30;

  // ── Health: thin edge bar + small number, no panel ──────────
  const hRoot = healthHud.root;
  Object.assign(hRoot.style, {
    bottom: `calc(4px + env(safe-area-inset-bottom, 0px))`,
    left: `calc(16px + env(safe-area-inset-left, 0px))`,
    padding: "0",
    background: "transparent",
    border: "none",
    borderRadius: "3px",
    boxShadow: "none",
    backdropFilter: "none",
    transform: "none",
    minWidth: "120px",
    width: "120px",
    opacity: MOBILE_BASE_OPACITY,
    transition: "opacity 0.3s ease",
  });
  // Hide "HP" label (child 1), shrink numeric (child 2), widen bar (child 3)
  const hChildren = Array.from(hRoot.children) as HTMLElement[];
  if (hChildren[1]) hChildren[1].style.display = "none"; // "HP" label
  if (hChildren[2]) {
    Object.assign(hChildren[2].style, {
      fontSize: "18px",
      fontWeight: "700",
      marginBottom: "3px",
      minWidth: "0",
      textShadow: "0 1px 4px rgba(0, 0, 0, 1), 0 0 8px rgba(0, 0, 0, 0.5)",
    });
  }
  if (hChildren[3]) (hChildren[3] as HTMLElement).style.height = "6px";

  // ── Ammo: floating text, no panel ───────────────────────────
  const aRoot = ammoHud.root;
  Object.assign(aRoot.style, {
    bottom: `calc(4px + env(safe-area-inset-bottom, 0px))`,
    right: `calc(10px + env(safe-area-inset-right, 0px))`,
    padding: "0",
    background: "transparent",
    border: "none",
    borderRadius: "0",
    boxShadow: "none",
    backdropFilter: "none",
    transform: "none",
    textAlign: "right",
    opacity: MOBILE_BASE_OPACITY,
    transition: "opacity 0.3s ease",
  });
  // Shrink ammo font sizes
  const aChildren = Array.from(aRoot.children) as HTMLElement[];
  if (aChildren[0]) {
    // Row containing magEl and reserveWrap
    aChildren[0].style.gap = "2px";
    const magEl = aChildren[0].children[0] as HTMLElement | undefined;
    if (magEl) {
      Object.assign(magEl.style, {
        fontSize: "22px",
        minWidth: "0",
        textShadow: "0 1px 4px rgba(0, 0, 0, 1), 0 0 8px rgba(0, 0, 0, 0.5)",
      });
    }
    const reserveWrap = aChildren[0].children[1] as HTMLElement | undefined;
    if (reserveWrap) {
      reserveWrap.style.fontSize = "11px";
      const reserveSpan = reserveWrap.querySelector("span");
      if (reserveSpan) (reserveSpan as HTMLElement).style.fontSize = "13px";
    }
  }

  // ── Timer: more aggressive scale ────────────────────────────
  timerHud.setBaseScale(0.45);
  Object.assign(timerHud.root.style, {
    top: `calc(4px + env(safe-area-inset-top, 0px))`,
    padding: "2px 10px 3px",
    minWidth: "80px",
    background: "rgba(8, 16, 28, 0.35)",
    borderRadius: "6px",
    opacity: MOBILE_BASE_OPACITY,
    transition: "opacity 0.3s ease",
  });

  // ── Kill feed: compact width ────────────────────────────────
  killFeed.root.style.width = "220px";
  killFeed.root.style.minWidth = "0";

  // ── Auto-opacity flash helper (called in step loop) ─────────
  return (dt: number, currentHealth: number, currentMag: number): void => {
    // Health flash
    if (currentHealth !== mobilePrevHealth) {
      hRoot.style.opacity = MOBILE_FLASH_OPACITY;
      mobileHealthFlashTimer = MOBILE_FLASH_DURATION_S;
      mobilePrevHealth = currentHealth;
    }
    if (mobileHealthFlashTimer > 0) {
      mobileHealthFlashTimer -= dt;
      if (mobileHealthFlashTimer <= 0) hRoot.style.opacity = MOBILE_BASE_OPACITY;
    }

    // Ammo flash
    if (currentMag !== mobilePrevMag) {
      aRoot.style.opacity = MOBILE_FLASH_OPACITY;
      mobileAmmoFlashTimer = MOBILE_FLASH_DURATION_S;
      mobilePrevMag = currentMag;
    }
    if (mobileAmmoFlashTimer > 0) {
      mobileAmmoFlashTimer -= dt;
      if (mobileAmmoFlashTimer <= 0) aRoot.style.opacity = MOBILE_BASE_OPACITY;
    }
  };
}
