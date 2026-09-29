import { SANS_FONT, SERIF_FONT } from "./uiFonts";
import { isMobileDevice } from "../runtime/input/MobileDetect";

/** Rotation overlay shared by the portrait menu and landscape gameplay surfaces. */
export class OrientationGuard {
  private readonly overlay: HTMLDivElement;
  private showing = false;

  constructor(mountEl: HTMLElement, private readonly orientation: "portrait" | "landscape") {
    if (orientation === "portrait" && !isMobileDevice()) {
      this.overlay = document.createElement("div");
      return;
    }
    const portraitMenu = orientation === "portrait";
    const animationName = portraitMenu ? "loading-rotate-hint" : "mobile-rotate-hint";
    this.overlay = document.createElement("div");
    Object.assign(this.overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: portraitMenu ? "99" : "100",
      background: "rgba(6, 4, 2, 0.95)",
      display: "none",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "24px",
      userSelect: "none",
      WebkitUserSelect: "none",
    });

    // Rotate icon (simple CSS phone outline with rotation arrow)
    const icon = document.createElement("div");
    Object.assign(icon.style, {
      width: portraitMenu ? "120px" : "80px",
      height: portraitMenu ? "80px" : "120px",
      border: "3px solid rgba(255, 214, 150, 0.6)",
      borderRadius: "12px",
      position: "relative",
      animation: `${animationName} 2s ease-in-out infinite`,
    });
    // Inner screen indicator
    const screen = document.createElement("div");
    Object.assign(screen.style, {
      position: "absolute",
      inset: "8px",
      background: "rgba(255, 214, 150, 0.15)",
      borderRadius: "4px",
    });
    icon.append(screen);

    const text = document.createElement("div");
    Object.assign(text.style, {
      fontFamily: SERIF_FONT,
      fontSize: "22px",
      fontWeight: "600",
      color: "rgba(255, 241, 224, 0.9)",
      letterSpacing: "0.06em",
      textAlign: "center",
      padding: "0 32px",
    });
    text.textContent = `Rotate your device to ${orientation}`;

    const subtext = document.createElement("div");
    Object.assign(subtext.style, {
      fontFamily: SANS_FONT,
      fontSize: "14px",
      color: "rgba(241, 213, 175, 0.5)",
      letterSpacing: "0.03em",
    });
    subtext.textContent = portraitMenu
      ? "The menu is best viewed in portrait mode"
      : "This game is best played in landscape mode";

    // Inject keyframe animation via a <style> tag
    const style = document.createElement("style");
    style.textContent = `
      @keyframes ${animationName} {
        0%, 100% { transform: rotate(0deg); }
        25%, 75% { transform: rotate(${portraitMenu ? -90 : 90}deg); }
      }
    `;
    this.overlay.append(style, icon, text, subtext);
    mountEl.append(this.overlay);

    // Listen for orientation/resize changes
    window.addEventListener("resize", this.check);
    window.addEventListener("orientationchange", this.check);
    if (portraitMenu) this.check();
  }

  /** Attempt to lock screen to landscape (fails gracefully on iOS Safari). */
  async requestLandscape(): Promise<void> {
    try {
      // Screen Orientation API lock() is not in all TypeScript lib types
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
      };
      if (typeof orientation.lock === "function") {
        await orientation.lock("landscape");
      }
    } catch {
      // API not supported or permission denied — CSS fallback will handle it
    }
  }

  readonly check = (): void => {
    if (!isMobileDevice()) return;
    const blocked = this.orientation === "landscape"
      ? window.innerHeight > window.innerWidth
      : window.innerWidth > window.innerHeight;
    if (blocked && !this.showing) {
      this.showing = true;
      this.overlay.style.display = "flex";
    } else if (!blocked && this.showing) {
      this.showing = false;
      this.overlay.style.display = "none";
    }
  };

  isBlocking(): boolean {
    return this.showing;
  }

  dispose(): void {
    window.removeEventListener("resize", this.check);
    window.removeEventListener("orientationchange", this.check);
    this.overlay.remove();
  }
}
