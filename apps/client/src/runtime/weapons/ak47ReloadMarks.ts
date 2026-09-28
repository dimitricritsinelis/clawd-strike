/**
 * Single source of truth for the AK-47 magazine-only reload timeline.
 *
 * Seconds at the base (unbuffed) duration. The Blender clip
 * (assets/source/ak47/viewmodel_v2.py) is authored to these marks, build.py
 * copies them into provenance.json, and gameplay, the viewmodel and reload
 * audio all read them from here. A reload-speed buff scales every mark by
 * duration / AK47_RELOAD_DURATION_S.
 */
export const AK47_RELOAD_DURATION_S = 1.7;

export const AK47_RELOAD_MARKS = Object.freeze({
  /** Support hand starts leaving the handguard; the rifle begins its cant. */
  leaveHandguard: 0.0,
  /** Hand closes on the seated magazine (index on the front edge, thumb onto the paddle). */
  grip: 0.24,
  /** Thumb pushes the paddle release: the release click. */
  release: 0.3,
  /** Magazine fully rocked forward about the front lug. */
  rockedOut: 0.42,
  /** Old magazine let go at the lower left, out of frame. */
  drop: 0.56,
  /** Fresh magazine enters view, tilted for the hook. */
  newMagazineInView: 0.76,
  /** Front lug hooked in the magazine well. */
  hook: 0.98,
  /** Rear latch clicks: the magazine is seated and the rounds count from here. */
  latch: 1.1,
  /** Grip opens after the seat tap. */
  gripOpens: 1.16,
  /** Hand back on the handguard. */
  handOnHandguard: 1.4,
  /** Rifle settled at idle. */
  end: 1.7,
});

export type Ak47ReloadMark = keyof typeof AK47_RELOAD_MARKS;

/** Normalised (0..1) position of a mark in the clip. */
export function ak47ReloadMarkT01(mark: Ak47ReloadMark): number {
  return AK47_RELOAD_MARKS[mark] / AK47_RELOAD_DURATION_S;
}
