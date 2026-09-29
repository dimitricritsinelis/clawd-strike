import assert from "node:assert/strict";
import test from "node:test";
import { OrientationGuard } from "./OrientationGuard";
import { resetMobileDetectionCacheForTest } from "../runtime/input/MobileDetect";

class ElementStub {
  style: Record<string, string> = {};
  children: ElementStub[] = [];
  textContent = "";
  removed = false;
  append(...children: ElementStub[]): void { this.children.push(...children); }
  remove(): void { this.removed = true; }
}

async function withBrowser(mobile: boolean, run: (mount: ElementStub, viewport: { innerWidth: number; innerHeight: number }, listeners: Map<string, () => void>, locks: string[]) => void | Promise<void>): Promise<void> {
  const globals = globalThis as Record<string, unknown>;
  const saved = new Map(["window", "document", "navigator", "screen"].map((key) => [key, Object.getOwnPropertyDescriptor(globals, key)]));
  const listeners = new Map<string, () => void>();
  const locks: string[] = [];
  const viewport = {
    innerWidth: 800, innerHeight: 400, ontouchstart: null,
    addEventListener: (event: string, listener: () => void) => listeners.set(event, listener),
    removeEventListener: (event: string) => listeners.delete(event),
  };
  for (const [key, value] of Object.entries({
    window: viewport,
    document: { createElement: () => new ElementStub() },
    navigator: { userAgent: mobile ? "iPhone" : "Macintosh", maxTouchPoints: mobile ? 5 : 0 },
    screen: { orientation: { lock: async (orientation: string) => { locks.push(orientation); } } },
  })) Object.defineProperty(globals, key, { configurable: true, writable: true, value });
  resetMobileDetectionCacheForTest();
  try {
    await run(new ElementStub(), viewport, listeners, locks);
  } finally {
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globals, key, descriptor);
      else delete globals[key];
    }
    resetMobileDetectionCacheForTest();
  }
}

test("menu blocks landscape immediately, releases portrait and square viewports, and disposes listeners", async () => {
  await withBrowser(true, (mount, viewport, listeners) => {
    const guard = new OrientationGuard(mount as unknown as HTMLElement, "portrait");
    const overlay = mount.children[0]!;
    assert.equal(guard.isBlocking(), true);
    assert.equal(overlay.style.display, "flex");
    assert.equal(overlay.style.zIndex, "99");
    viewport.innerWidth = 400;
    listeners.get("resize")!();
    assert.equal(guard.isBlocking(), false);
    viewport.innerHeight = 800;
    listeners.get("orientationchange")!();
    assert.equal(guard.isBlocking(), false);
    guard.dispose();
    assert.equal(listeners.size, 0);
    assert.equal(overlay.removed, true);
  });
});

test("gameplay checks at activation, blocks portrait and requests landscape locking", async () => {
  await withBrowser(true, async (mount, viewport, listeners, locks) => {
    viewport.innerWidth = 200;
    const guard = new OrientationGuard(mount as unknown as HTMLElement, "landscape");
    assert.equal(guard.isBlocking(), false);
    guard.check();
    assert.equal(guard.isBlocking(), true);
    assert.equal(mount.children[0]!.style.zIndex, "100");
    await guard.requestLandscape();
    assert.deepEqual(locks, ["landscape"]);
    viewport.innerWidth = 800;
    listeners.get("resize")!();
    assert.equal(guard.isBlocking(), false);
    guard.dispose();
  });
});

test("desktop loading menus do not mount a rotation overlay or listeners", async () => {
  await withBrowser(false, (mount, _viewport, listeners) => {
    const guard = new OrientationGuard(mount as unknown as HTMLElement, "portrait");
    assert.equal(mount.children.length, 0);
    assert.equal(listeners.size, 0);
    assert.equal(guard.isBlocking(), false);
    guard.dispose();
  });
});
