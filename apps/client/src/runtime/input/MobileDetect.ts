let _isMobile: boolean | null = null;

/**
 * iPadOS 13+ Safari reports a desktop Macintosh user-agent with no "iPad"
 * token, so a UA-only check classifies every modern iPad as a desktop. Those
 * sessions then get the pointer-lock path, which iPadOS does not support, and
 * no touch controls are mounted — the game boots completely unplayable.
 *
 * A real Mac reports maxTouchPoints 0 (trackpads and Touch Bars do not count),
 * so a Macintosh UA claiming multiple touch points is an iPad.
 */
function isIpadOsMasqueradingAsDesktop(): boolean {
  const ua = navigator.userAgent;
  const platform = (navigator as Navigator & { platform?: string }).platform ?? "";
  const looksLikeMac = /Macintosh|MacIntel/i.test(ua) || /MacIntel/i.test(platform);
  return looksLikeMac && navigator.maxTouchPoints > 1;
}

/**
 * Detects whether the current device is a mobile/touch-primary device.
 * Combines feature detection with UA check to avoid false positives
 * on touch-enabled laptops. Result is cached for the session.
 */
export function isMobileDevice(): boolean {
  if (_isMobile !== null) return _isMobile;

  const hasTouch = "ontouchstart" in window && navigator.maxTouchPoints > 0;
  if (!hasTouch) {
    _isMobile = false;
    return _isMobile;
  }

  _isMobile =
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || isIpadOsMasqueradingAsDesktop();
  return _isMobile;
}

/** Test-only: clears the cached detection result. */
export function resetMobileDetectionCacheForTest(): void {
  _isMobile = null;
}
