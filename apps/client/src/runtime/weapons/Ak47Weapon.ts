import { Vector3 } from "three";
import type { WorldColliders } from "../sim/collision/WorldColliders";
import {
  Ak47FireController,
  type Ak47FireControllerOptions,
  type Ak47FireUpdateInput,
  type Ak47FireUpdateResult,
  type Ak47ShotEvent,
} from "./Ak47FireController";
import { AK47_RELOAD_DURATION_S, AK47_RELOAD_MARKS } from "./ak47ReloadMarks";

const DEFAULT_MAG_CAPACITY = 30;
const RESERVE_START = 90;
export type Ak47WeaponOptions = Ak47FireControllerOptions & {
  /** Rounds restored to the magazine at each wave/run reset. */
  magazineCapacity?: number;
  /** Reserve ammunition restored at the beginning of every wave/run. */
  reserveStart?: number;
  /** Hard ceiling for deterministic ammo rewards earned during a wave. */
  reserveCapacity?: number;
};

export type Ak47AmmoSnapshot = {
  mag: number;
  reserve: number;
  reloading: boolean;
  /**
   * Progress over AK47_RELOAD_DURATION_S (one magazine-only reload for partial
   * and empty magazines); 0 when not reloading. The rounds are already counted
   * once this passes the latch mark.
   */
  reloadT01: number;
  /**
   * Increments at every reload start. The viewmodel treats a change while the
   * previous reload's clip is still returning to idle as a restart: it plays
   * that return (backwards until it meets the new reload's progress, or
   * forwards to the end and then catches up) rather than jumping the hand to
   * clip time 0. Optional so hand-built snapshots that scrub reloadT01 skip
   * restart handling.
   */
  reloadSerial?: number;
};

export class Ak47Weapon {
  private readonly fireController: Ak47FireController;
  private readonly magazineCapacity: number;
  private readonly reserveStart: number;
  private readonly reserveCapacity: number;
  private readonly ammoSnapshot: Ak47AmmoSnapshot = {
    mag: DEFAULT_MAG_CAPACITY,
    reserve: RESERVE_START,
    reloading: false,
    reloadT01: 0,
    reloadSerial: 0,
  };
  private readonly fireInput: Ak47FireUpdateInput = {
    deltaSeconds: 0,
    fireHeld: false,
    shotBudget: 0,
    origin: new Vector3(),
    forward: new Vector3(0, 0, -1),
    grounded: true,
    speedMps: 0,
    world: null as unknown as WorldColliders,
  };

  private mag = DEFAULT_MAG_CAPACITY;
  private reserve = RESERVE_START;
  private reloading = false;
  /** Base-timeline seconds; advances at the speed the reload started with. */
  private reloadTimerS = 0;
  /**
   * Reload speed multiplier frozen at startReload. Reload audio is scheduled
   * once from the duration reported then, so a buff that starts or expires
   * mid-reload applies from the next reload instead of desyncing this one.
   */
  private activeReloadSpeed = 1.0;
  /** True once the fresh magazine latched and its rounds were counted. */
  private reloadCommitted = false;
  /** A fresh trigger press between the release and the latch, fired at the latch if still held. */
  private firePressedWhileCommitted = false;
  private reloadQueued = false;
  private reloadSerial = 0;

  // Callbacks for audio events
  /** `durationSeconds` is already divided by the reload speed multiplier, which holds for the whole reload. */
  onReloadStart: ((durationSeconds: number) => void) | null = null;
  /**
   * The reload finished with the fresh magazine counted. `finishedEarly` is
   * false at the natural end of the timeline and true when a fire press after
   * the latch, or one made after the release and still held at the latch,
   * skipped the rest (the viewmodel fast-forwards the hand's return and fires).
   */
  onReloadEnd: ((finishedEarly: boolean) => void) | null = null;
  /**
   * The reload was abandoned and the old magazine count stands: a fire press
   * before the release mark (the old magazine is still seated), or a reset.
   */
  onReloadCancel: (() => void) | null = null;
  onDryFire: (() => void) | null = null;

  // Buff modifiers
  /** Bottomless Mag: magazines still empty and reload, but reloads do not drain reserve. */
  private freeReloads = false;
  private reloadSpeedMultiplier = 1.0;

  // Dry-fire rate-limiting: only click once per trigger pull
  private dryFireCooldownS = 0;
  private wasFireHeld = false;

  constructor(options: Ak47WeaponOptions) {
    this.magazineCapacity = normalizePositiveAmmoCount(
      options.magazineCapacity,
      DEFAULT_MAG_CAPACITY,
    );
    this.reserveStart = normalizeAmmoCount(options.reserveStart, RESERVE_START);
    this.reserveCapacity = Math.max(
      this.reserveStart,
      normalizeAmmoCount(options.reserveCapacity, this.reserveStart),
    );
    this.mag = this.magazineCapacity;
    this.ammoSnapshot.mag = this.magazineCapacity;
    this.reserve = this.reserveStart;
    this.ammoSnapshot.reserve = this.reserveStart;
    this.fireController = new Ak47FireController(options);
  }

  queueReload(): void {
    this.reloadQueued = true;
  }

  setFreeReloads(enabled: boolean): void {
    this.freeReloads = enabled;
  }

  setFireIntervalS(interval: number): void {
    this.fireController.setFireIntervalS(interval);
  }

  /** Takes effect at the next reload start; a reload in progress keeps its speed. */
  setReloadSpeedMultiplier(multiplier: number): void {
    this.reloadSpeedMultiplier = Math.max(0.1, multiplier);
  }

  /**
   * Adds reserve ammunition without touching the current magazine or reload
   * state. Returns the amount actually granted after applying the profile cap.
   */
  grantReserveAmmo(amount: number): number {
    const requested = normalizeAmmoCount(amount, 0);
    if (requested <= 0) return 0;
    const before = this.reserve;
    this.reserve = Math.min(this.reserveCapacity, this.reserve + requested);
    return this.reserve - before;
  }

  reset(): void {
    if (this.reloading) {
      this.cancelReload(true);
    }
    this.mag = this.magazineCapacity;
    this.reserve = this.reserveStart;
    this.reloadQueued = false;
    this.dryFireCooldownS = 0;
    this.wasFireHeld = false;
    this.freeReloads = false;
    this.reloadSpeedMultiplier = 1.0;
    this.fireController.reset();
  }

  cancelTrigger(): void {
    this.reloadQueued = false;
    this.fireController.cancelTrigger();
  }

  getAmmoSnapshot(): Ak47AmmoSnapshot {
    this.ammoSnapshot.mag = this.mag;
    this.ammoSnapshot.reserve = this.reserve;
    this.ammoSnapshot.reloading = this.reloading;
    this.ammoSnapshot.reloadSerial = this.reloadSerial;
    this.ammoSnapshot.reloadT01 = this.reloading ? Math.min(1, this.reloadTimerS / AK47_RELOAD_DURATION_S) : 0;
    return this.ammoSnapshot;
  }

  update(input: Ak47FireUpdateInput, onShot?: (shot: Ak47ShotEvent) => void): Ak47FireUpdateResult {
    const wantsReload = this.reloadQueued;
    this.reloadQueued = false;

    // Dry-fire cooldown tick
    if (this.dryFireCooldownS > 0) {
      this.dryFireCooldownS -= Math.max(0, input.deltaSeconds);
    }

    if (this.reloading) {
      this.reloadTimerS += Math.max(0, input.deltaSeconds) * this.activeReloadSpeed;

      // The rounds count on the frame the fresh magazine latches.
      if (!this.reloadCommitted && this.reloadTimerS >= AK47_RELOAD_MARKS.latch) {
        this.commitReloadRounds();
      }

      // A fresh trigger pull mid-reload with rounds in the magazine interrupts it.
      // Before the release the old magazine is still seated: the press cancels
      // and keeps the old count. From the release to the latch the old magazine
      // is out (the player saw it thrown away), so the reload is committed; a
      // press there is remembered and, if the trigger is still held when the
      // fresh magazine latches, fires then. After the latch the new magazine is
      // already counted and a press skips the rest of the reload.
      // Must go through fireAndAccount — returning the raw fire result here used
      // to skip the magazine deduction entirely, so every cancelled reload
      // granted a free, fully damaging round that the HUD never counted.
      const freshPress = input.fireHeld && !this.wasFireHeld;
      let interrupt = false;
      if (this.reloadCommitted) {
        interrupt = input.fireHeld && (freshPress || this.firePressedWhileCommitted) && this.mag > 0;
        if (interrupt) {
          this.finishReload();
          this.onReloadEnd?.(true);
        }
      } else if (this.reloadTimerS < AK47_RELOAD_MARKS.release) {
        interrupt = freshPress && this.mag > 0;
        if (interrupt) this.cancelReload(true);
        // An empty magazine has nothing to cancel back to: remember the press
        // exactly as in the committed window, so an early pull fires at the
        // latch instead of being dropped until the natural end.
        else if (freshPress) this.firePressedWhileCommitted = true;
      } else if (freshPress) {
        this.firePressedWhileCommitted = true;
      }
      if (interrupt) {
        this.wasFireHeld = input.fireHeld;
        return this.fireAndAccount(input, onShot);
      }

      if (this.reloadTimerS >= AK47_RELOAD_DURATION_S) {
        this.finishReload();
        this.onReloadEnd?.(false);
      }
      this.wasFireHeld = input.fireHeld;
      return this.updateWithoutFiring(input);
    }

    if (wantsReload && this.mag < this.magazineCapacity && this.startReload()) {
      this.wasFireHeld = input.fireHeld;
      return this.updateWithoutFiring(input);
    }

    if (this.mag === 0 && this.startReload()) {
      this.wasFireHeld = input.fireHeld;
      return this.updateWithoutFiring(input);
    }

    if (this.mag <= 0) {
      // Dry-fire: click once per trigger pull when mag is empty
      if (input.fireHeld && !this.wasFireHeld && this.dryFireCooldownS <= 0) {
        this.onDryFire?.();
        this.dryFireCooldownS = 0.5; // prevent rapid clicking
      }
      this.wasFireHeld = input.fireHeld;
      return this.updateWithoutFiring(input);
    }

    const fireResult = this.fireAndAccount(input, onShot);

    this.wasFireHeld = input.fireHeld;
    return fireResult;
  }

  /**
   * The single exit for any path that can actually discharge rounds. Every
   * bullet handed to `onShot` is deducted from the magazine here, so no caller
   * can fire without paying ammo for it.
   */
  private fireAndAccount(
    input: Ak47FireUpdateInput,
    onShot?: (shot: Ak47ShotEvent) => void,
  ): Ak47FireUpdateResult {
    const fireResult = this.forwardToFireController(input, input.fireHeld, this.mag, onShot);

    if (fireResult.shotsFired > 0) {
      this.mag = Math.max(0, this.mag - fireResult.shotsFired);
      if (this.mag === 0) {
        this.startReload();
      }
    }

    return fireResult;
  }

  private updateWithoutFiring(input: Ak47FireUpdateInput): Ak47FireUpdateResult {
    return this.forwardToFireController(input, false, 0);
  }

  private forwardToFireController(
    input: Ak47FireUpdateInput,
    fireHeld: boolean,
    shotBudget: number,
    onShot?: (shot: Ak47ShotEvent) => void,
  ): Ak47FireUpdateResult {
    this.fireInput.deltaSeconds = input.deltaSeconds;
    this.fireInput.fireHeld = fireHeld;
    this.fireInput.shotBudget = shotBudget;
    this.fireInput.origin = input.origin;
    this.fireInput.forward = input.forward;
    this.fireInput.grounded = input.grounded;
    this.fireInput.speedMps = input.speedMps;
    this.fireInput.world = input.world;
    return this.fireController.update(this.fireInput, onShot);
  }

  private startReload(): boolean {
    const hasAmmoToLoad = this.reserve > 0 || this.freeReloads;
    if (this.reloading || !hasAmmoToLoad || this.mag >= this.magazineCapacity) return false;

    this.reloading = true;
    this.reloadCommitted = false;
    this.firePressedWhileCommitted = false;
    this.reloadTimerS = 0;
    this.activeReloadSpeed = this.reloadSpeedMultiplier;
    this.reloadSerial += 1;
    this.reloadQueued = false;
    this.fireController.cancelTrigger();
    this.onReloadStart?.(AK47_RELOAD_DURATION_S / this.activeReloadSpeed);
    return true;
  }

  private cancelReload(emitCallback: boolean): void {
    if (!this.reloading) return;
    this.reloading = false;
    this.reloadCommitted = false;
    this.firePressedWhileCommitted = false;
    this.reloadTimerS = 0;
    if (emitCallback) {
      this.onReloadCancel?.();
    }
  }

  /** Moves the fresh magazine's rounds in; called once per reload, at the latch mark. */
  private commitReloadRounds(): void {
    const needed = Math.max(0, this.magazineCapacity - this.mag);
    const moved = this.freeReloads ? needed : Math.min(needed, this.reserve);
    this.mag += moved;
    if (!this.freeReloads) this.reserve -= moved;
    this.reloadCommitted = true;
  }

  private finishReload(): void {
    if (!this.reloadCommitted) this.commitReloadRounds();
    this.reloading = false;
    this.reloadCommitted = false;
    this.firePressedWhileCommitted = false;
    this.reloadTimerS = 0;
  }
}

function normalizeAmmoCount(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function normalizePositiveAmmoCount(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
}
