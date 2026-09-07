/**
 * CountdownHud — center-screen "5…4…3…2…1" shown after the loading screen,
 * before the player can move and before the wave timer starts.
 */
export class CountdownHud {
  private readonly root: HTMLDivElement;
  private lastShown = -1;

  constructor(mountEl: HTMLElement) {
    this.root = document.createElement("div");
    Object.assign(this.root.style, {
      position: "absolute",
      inset: "0",
      display: "none",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "27",
      pointerEvents: "none",
      userSelect: "none",
      fontFamily: '"Segoe UI", Tahoma, Verdana, sans-serif',
      color: "rgba(235, 240, 250, 0.95)",
      textShadow: "0 4px 18px rgba(0, 0, 0, 0.7)",
    });
    const num = document.createElement("span");
    num.className = "countdown-num";
    Object.assign(num.style, { fontSize: "120px", fontWeight: "700", lineHeight: "1", fontVariantNumeric: "tabular-nums" });
    this.root.append(num);
    mountEl.append(this.root);
  }

  /** Show the ceiling of the remaining seconds; hides itself at <= 0. */
  update(remainingS: number): void {
    if (remainingS <= 0) {
      this.root.style.display = "none";
      this.lastShown = -1;
      return;
    }
    this.root.style.display = "flex";
    const shown = Math.ceil(remainingS);
    if (shown !== this.lastShown) {
      this.lastShown = shown;
      (this.root.querySelector(".countdown-num") as HTMLSpanElement).textContent = String(shown);
    }
  }

  dispose(): void {
    this.root.remove();
  }
}
