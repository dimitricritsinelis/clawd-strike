import {
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from "three";

export type FloorTextureQuality = "1k" | "2k" | "4k";

export type FloorTextureSet = {
  albedo: string;
  normal: string;
  arm: string;
};

export type FloorTextureResolution = {
  materialId: string;
  requestedQuality: FloorTextureQuality;
  resolvedQuality: FloorTextureQuality;
  urls: readonly string[];
};

export type FloorMaterialLoadOptions = {
  materialIds?: ReadonlySet<string>;
  requestObserver?: FloorTexturePreloadOptions["requestObserver"];
};

export type FloorTexturePreloadOptions = {
  materialIds?: ReadonlySet<string>;
  allowUpscale?: boolean;
  requestObserver?: {
    expectChild?: (id: string) => void;
    start: (id: string) => void;
    complete: (id: string) => void;
    fail: (id: string, error: unknown) => void;
  };
};

type FloorMaterialEntry = {
  id: string;
  tileSizeM: number;
  tintHex?: string;
  albedoBoost?: number;
  albedoGamma?: number;
  dustStrength?: number;
  roughness?: number;
  normalScale?: number;
  aoIntensity?: number;
  textures: Partial<Record<FloorTextureQuality, FloorTextureSet>>;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown, context: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context}: expected object`);
  }
  return value as UnknownRecord;
}

function asString(value: unknown, context: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${context}: expected non-empty string`);
  }
  return value;
}

function asNumber(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}: expected finite number`);
  }
  return value;
}

function asNumberInRange(value: unknown, context: string, min: number, max: number): number {
  const parsed = asNumber(value, context);
  if (parsed < min || parsed > max) {
    throw new Error(`${context}: expected number in range [${min}, ${max}]`);
  }
  return parsed;
}

function asOptionalNumberInRange(
  value: unknown,
  context: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined;
  return asNumberInRange(value, context, min, max);
}

function asOptionalString(value: unknown, context: string): string | undefined {
  if (value === undefined) return undefined;
  return asString(value, context);
}

function parseTextureSet(value: unknown, context: string): FloorTextureSet {
  const record = asRecord(value, context);
  const albedo = asString(record.albedo, `${context}.albedo`);
  const normal = asString(record.normal, `${context}.normal`);
  const arm = asString(record.arm, `${context}.arm`);
  return { albedo, normal, arm };
}

function parseOptionalTextureSet(value: unknown, context: string): FloorTextureSet | undefined {
  if (value === undefined) return undefined;
  return parseTextureSet(value, context);
}

export function resolveFloorTextureSetForQuality(
  textures: Partial<Record<FloorTextureQuality, FloorTextureSet>>,
  quality: FloorTextureQuality,
  allowUpscale = true,
): { quality: FloorTextureQuality; textures: FloorTextureSet } {
  const preferredQualities: readonly FloorTextureQuality[] = allowUpscale
    ? quality === "1k"
      ? ["1k", "4k", "2k"]
      : quality === "2k"
        ? ["2k", "4k", "1k"]
        : ["4k", "2k", "1k"]
    : quality === "1k"
      ? ["1k"]
      : quality === "2k"
        ? ["2k", "1k"]
        : ["4k", "2k", "1k"];
  for (const candidate of preferredQualities) {
    const resolved = textures[candidate];
    if (resolved) return { quality: candidate, textures: resolved };
  }
  const policy = allowUpscale ? "supported" : "equal-or-lower";
  throw new Error(`Material is missing an ${policy} texture variant for requested quality '${quality}'`);
}

function parseEntry(value: unknown, index: number): FloorMaterialEntry {
  const context = `materials[${index}]`;
  const record = asRecord(value, context);
  const texturesRaw = asRecord(record.textures, `${context}.textures`);
  const tintHexRaw = asOptionalString(record.tintHex, `${context}.tintHex`);
  const albedoBoostRaw = asOptionalNumberInRange(record.albedoBoost, `${context}.albedoBoost`, 0, 2);
  const albedoGammaRaw = asOptionalNumberInRange(record.albedoGamma, `${context}.albedoGamma`, 0.65, 1.25);
  const dustStrengthRaw = asOptionalNumberInRange(record.dustStrength, `${context}.dustStrength`, 0, 0.8);
  const roughnessRaw = asOptionalNumberInRange(record.roughness, `${context}.roughness`, 0, 1);
  const normalScaleRaw = asOptionalNumberInRange(record.normalScale, `${context}.normalScale`, 0, 1);
  const aoIntensityRaw = asOptionalNumberInRange(record.aoIntensity, `${context}.aoIntensity`, 0, 1);
  if (tintHexRaw !== undefined && !/^#[0-9a-fA-F]{6}$/.test(tintHexRaw)) {
    throw new Error(`${context}.tintHex: expected #RRGGBB hex color`);
  }

  const textures: Partial<Record<FloorTextureQuality, FloorTextureSet>> = {};
  const oneK = parseOptionalTextureSet(texturesRaw["1k"], `${context}.textures.1k`);
  const twoK = parseOptionalTextureSet(texturesRaw["2k"], `${context}.textures.2k`);
  const fourK = parseOptionalTextureSet(texturesRaw["4k"], `${context}.textures.4k`);
  if (oneK) textures["1k"] = oneK;
  if (twoK) textures["2k"] = twoK;
  if (fourK) textures["4k"] = fourK;

  const entry: FloorMaterialEntry = {
    id: asString(record.id, `${context}.id`),
    tileSizeM: asNumberInRange(record.tileSizeM, `${context}.tileSizeM`, 0.05, 64),
    textures,
  };

  if (!entry.textures["1k"] && !entry.textures["2k"] && !entry.textures["4k"]) {
    throw new Error(`${context}.textures: expected at least one of 1k, 2k, or 4k`);
  }

  if (albedoBoostRaw !== undefined) entry.albedoBoost = albedoBoostRaw;
  if (albedoGammaRaw !== undefined) entry.albedoGamma = albedoGammaRaw;
  if (dustStrengthRaw !== undefined) entry.dustStrength = dustStrengthRaw;
  if (roughnessRaw !== undefined) entry.roughness = roughnessRaw;
  if (normalScaleRaw !== undefined) entry.normalScale = normalScaleRaw;
  if (aoIntensityRaw !== undefined) entry.aoIntensity = aoIntensityRaw;
  if (tintHexRaw !== undefined) entry.tintHex = tintHexRaw;

  return entry;
}

export function parseFloorMaterialManifest(value: unknown): FloorMaterialEntry[] {
  const root = asRecord(value, "materials.json");
  const materials = root.materials;
  if (!Array.isArray(materials) || materials.length === 0) {
    throw new Error("materials.json.materials must be a non-empty array");
  }
  const parsed = materials.map((entry, index) => parseEntry(entry, index));
  const seenIds = new Set<string>();
  for (const entry of parsed) {
    if (seenIds.has(entry.id)) {
      throw new Error(`materials.json.materials: duplicate material id '${entry.id}'`);
    }
    seenIds.add(entry.id);
  }
  return parsed;
}

export class FloorMaterialLibrary {
  private static readonly textureCache = new Map<string, Promise<Texture>>();
  private static readonly resolvedTextureCache = new Map<string, Texture>();

  private readonly materialsById = new Map<string, FloorMaterialEntry>();
  private readonly textureLoader = new TextureLoader();

  private constructor(private readonly baseDirUrl: string, materials: FloorMaterialEntry[]) {
    for (const material of materials) {
      this.materialsById.set(material.id, material);
    }
  }

  static async load(
    manifestUrl: string,
    options: FloorMaterialLoadOptions = {},
  ): Promise<FloorMaterialLibrary> {
    const resolvedManifestUrl = new URL(manifestUrl, window.location.href);
    const requestId = `floor-manifest:${resolvedManifestUrl.toString()}`;
    options.requestObserver?.expectChild?.(requestId);
    options.requestObserver?.start(requestId);
    let response: Response;
    try {
      response = await fetch(resolvedManifestUrl.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch floor manifest (${response.status} ${response.statusText})`);
      }
      options.requestObserver?.complete(requestId);
    } catch (error) {
      options.requestObserver?.fail(requestId, error);
      throw error;
    }

    let manifestJson: unknown;
    try {
      manifestJson = await response.json();
    } catch (error) {
      throw new Error(
        `Failed to parse floor manifest JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const parsedMaterials = parseFloorMaterialManifest(manifestJson);
    const materials = options.materialIds
      ? parsedMaterials.filter((entry) => options.materialIds?.has(entry.id))
      : parsedMaterials;
    if (options.materialIds) {
      const selectedIds = new Set(materials.map((entry) => entry.id));
      const missingIds = [...options.materialIds].filter((id) => !selectedIds.has(id));
      if (missingIds.length > 0) {
        throw new Error(`Required floor materials are missing: ${missingIds.sort().join(", ")}`);
      }
    }
    const baseDirUrl = new URL("./", resolvedManifestUrl).toString();
    return new FloorMaterialLibrary(baseDirUrl, materials);
  }

  getTileSizeM(materialId: string): number {
    return this.requireMaterial(materialId).tileSizeM;
  }

  getMaterialIds(): readonly string[] {
    return Array.from(this.materialsById.keys());
  }

  async preloadAllTextures(
    quality: FloorTextureQuality,
    options: FloorTexturePreloadOptions = {},
  ): Promise<readonly FloorTextureResolution[]> {
    const seenUrls = new Set<string>();
    const preloadTasks: Promise<Texture>[] = [];
    const resolutions: FloorTextureResolution[] = [];

    const enqueueTexture = (relativeOrAbsoluteUrl: string, colorSpace: Texture["colorSpace"], aniso: number): void => {
      const resolvedUrl = this.resolveTextureUrl(relativeOrAbsoluteUrl);
      if (seenUrls.has(resolvedUrl)) return;
      seenUrls.add(resolvedUrl);
      const requestId = `floor-texture:${resolvedUrl}`;
      options.requestObserver?.expectChild?.(requestId);
      options.requestObserver?.start(requestId);
      preloadTasks.push(
        this.loadTexture(relativeOrAbsoluteUrl, colorSpace, aniso)
          .then((texture) => {
            options.requestObserver?.complete(requestId);
            return texture;
          })
          .catch((error: unknown) => {
            options.requestObserver?.fail(requestId, error);
            throw error;
          }),
      );
    };

    for (const entry of this.materialsById.values()) {
      if (options.materialIds && !options.materialIds.has(entry.id)) continue;
      const resolution = resolveFloorTextureSetForQuality(
        entry.textures,
        quality,
        options.allowUpscale !== false,
      );
      const maps = resolution.textures;
      resolutions.push({
        materialId: entry.id,
        requestedQuality: quality,
        resolvedQuality: resolution.quality,
        urls: [maps.albedo, maps.normal, maps.arm].map((url) => this.resolveTextureUrl(url)),
      });
      enqueueTexture(maps.albedo, SRGBColorSpace, 8);
      enqueueTexture(maps.normal, NoColorSpace, 1);
      enqueueTexture(maps.arm, NoColorSpace, 1);
    }

    await Promise.all(preloadTasks);
    return resolutions;
  }

  createStandardMaterial(materialId: string, quality: FloorTextureQuality): MeshStandardMaterial {
    const entry = this.requireMaterial(materialId);
    const maps = resolveFloorTextureSetForQuality(entry.textures, quality).textures;
    const roughness = entry.roughness ?? 0.96;
    const normalScale = entry.normalScale ?? 0.7;
    const albedoBoost = entry.albedoBoost ?? 1;
    const albedoGamma = entry.albedoGamma ?? 1;
    const dustStrength = entry.dustStrength ?? 0;

    const material = new MeshStandardMaterial({
      color: entry.tintHex ?? 0xffffff,
      roughness,
      metalness: 0,
      normalScale: new Vector2(normalScale, normalScale),
    });
    material.userData.floorAlbedoBoost = albedoBoost;
    material.userData.floorAlbedoGamma = albedoGamma;
    material.userData.floorDustStrength = dustStrength;

    if (!this.applyResolvedMaps(material, entry, maps)) {
      void this.applyMaps(material, entry, maps);
    }
    return material;
  }

  private requireMaterial(materialId: string): FloorMaterialEntry {
    const entry = this.materialsById.get(materialId);
    if (!entry) {
      throw new Error(`Floor material '${materialId}' is not defined in materials.json`);
    }
    return entry;
  }

  private resolveTextureUrl(relativeOrAbsoluteUrl: string): string {
    return new URL(relativeOrAbsoluteUrl, this.baseDirUrl).toString();
  }

  private async applyMaps(
    material: MeshStandardMaterial,
    entry: FloorMaterialEntry,
    maps: FloorTextureSet,
  ): Promise<void> {
    try {
      const [albedoTex, normalTex, armTex] = await Promise.all([
        this.loadTexture(maps.albedo, SRGBColorSpace, 8),
        this.loadTexture(maps.normal, NoColorSpace, 1),
        this.loadTexture(maps.arm, NoColorSpace, 1),
      ]);

      this.assignMaps(material, entry, albedoTex, normalTex, armTex);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.warn(`[floors] failed to load PBR floor textures: ${detail}`);
    }
  }

  private applyResolvedMaps(
    material: MeshStandardMaterial,
    entry: FloorMaterialEntry,
    maps: FloorTextureSet,
  ): boolean {
    const albedoTex = this.getResolvedTexture(maps.albedo);
    const normalTex = this.getResolvedTexture(maps.normal);
    const armTex = this.getResolvedTexture(maps.arm);
    if (!albedoTex || !normalTex || !armTex) {
      return false;
    }

    this.assignMaps(material, entry, albedoTex, normalTex, armTex);
    return true;
  }

  private getResolvedTexture(relativeOrAbsoluteUrl: string): Texture | null {
    const resolvedUrl = this.resolveTextureUrl(relativeOrAbsoluteUrl);
    return FloorMaterialLibrary.resolvedTextureCache.get(resolvedUrl) ?? null;
  }

  private assignMaps(
    material: MeshStandardMaterial,
    entry: FloorMaterialEntry,
    albedoTex: Texture,
    normalTex: Texture,
    armTex: Texture,
  ): void {
    material.map = albedoTex;
    material.normalMap = normalTex;
    material.aoMap = armTex;
    material.aoMapIntensity = entry.aoIntensity ?? 0.7;
    material.roughnessMap = armTex;
    material.metalnessMap = armTex;
    material.roughness = entry.roughness ?? 0.96;
    material.metalness = 0;
    material.needsUpdate = true;
  }

  private loadTexture(url: string, colorSpace: Texture["colorSpace"], aniso = 8): Promise<Texture> {
    const resolvedUrl = this.resolveTextureUrl(url);
    let promise = FloorMaterialLibrary.textureCache.get(resolvedUrl);
    if (!promise) {
      promise = this.textureLoader.loadAsync(resolvedUrl).then((texture) => {
        texture.colorSpace = colorSpace;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.anisotropy = aniso;
        texture.needsUpdate = true;
        FloorMaterialLibrary.resolvedTextureCache.set(resolvedUrl, texture);
        return texture;
      }).catch((error: unknown) => {
        FloorMaterialLibrary.textureCache.delete(resolvedUrl);
        FloorMaterialLibrary.resolvedTextureCache.delete(resolvedUrl);
        throw error;
      });
      FloorMaterialLibrary.textureCache.set(resolvedUrl, promise);
    }
    return promise;
  }
}
