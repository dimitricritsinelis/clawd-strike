import {
  type BuffType,
  type BuffDefinition,
  ORB_RADIUS_M,
  ORB_BOB_AMPLITUDE_M,
  ORB_LIFETIME_S,
  ORB_SPAWN_HEIGHT_OFFSET_M,
} from "./BuffTypes";
import { type SlabAabb } from "../sim/collision/rayVsAabb";

const TWO_PI = Math.PI * 2;

/** Simulation state of one dropped orb. Drawing lives in BuffOrbRenderer. */
export class BuffOrb {
  readonly definition: BuffDefinition;
  readonly spawnX: number;
  readonly spawnY: number;
  readonly spawnZ: number;
  readonly bobPhase: number;
  /** BuffOrbRenderer slot while the orb is drawn, otherwise -1. */
  renderSlot = -1;
  private readonly buffType: BuffType;
  private readonly aabb: SlabAabb;
  private readonly lifetimeS: number;
  private age = 0;

  constructor(
    position: { x: number; y: number; z: number },
    definition: BuffDefinition,
    lifetimeS = ORB_LIFETIME_S,
  ) {
    this.definition = definition;
    this.buffType = definition.type;
    this.lifetimeS = Number.isFinite(lifetimeS) && lifetimeS > 0
      ? lifetimeS
      : ORB_LIFETIME_S;
    this.spawnX = position.x;
    this.spawnY = position.y + ORB_SPAWN_HEIGHT_OFFSET_M;
    this.spawnZ = position.z;
    this.bobPhase = Math.random() * TWO_PI;

    this.aabb = {
      minX: this.spawnX - ORB_RADIUS_M * 1.7,
      maxX: this.spawnX + ORB_RADIUS_M * 1.7,
      minY: this.spawnY - ORB_RADIUS_M - ORB_BOB_AMPLITUDE_M,
      maxY: this.spawnY + ORB_RADIUS_M + ORB_BOB_AMPLITUDE_M,
      minZ: this.spawnZ - ORB_RADIUS_M * 1.7,
      maxZ: this.spawnZ + ORB_RADIUS_M * 1.7,
    };
  }

  update(deltaSeconds: number): boolean {
    this.age += deltaSeconds;
    return this.age < this.lifetimeS;
  }

  getAabb(): SlabAabb {
    return this.aabb;
  }

  getAge(): number {
    return this.age;
  }

  getLifetime(): number {
    return this.lifetimeS;
  }

  getPosition(): { x: number; y: number; z: number } {
    return { x: this.spawnX, y: this.spawnY, z: this.spawnZ };
  }

  getBuffType(): BuffType {
    return this.buffType;
  }
}
