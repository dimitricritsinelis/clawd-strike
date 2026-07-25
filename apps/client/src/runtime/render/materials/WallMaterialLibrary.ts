import {
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
} from "three";

export type WallTextureQuality = "1k" | "2k";

export type WallTextureSet = {
  albedo: string;
  normal: string;
  arm: string;
};

export type WallTextureResolution = {
  materialId: string;
  requestedQuality: WallTextureQuality;
  resolvedQuality: WallTextureQuality;
  urls: readonly string[];
};

export type WallMaterialLoadOptions = {
  materialIds?: ReadonlySet<string>;
  requestObserver?: WallTexturePreloadOptions["requestObserver"];
};

export type WallTexturePreloadOptions = {
  materialIds?: ReadonlySet<string>;
  allowUpscale?: boolean;
  requestObserver?: {
    expectChild?: (id: string) => void;
    start: (id: string) => void;
    complete: (id: string) => void;
    fail: (id: string, error: unknown) => void;
  };
};

type WallMaterialSource = {
  provider: string;
  assetId: string;
  url: string;
  license: string;
  nativeDimensionsM: { width: number; height: number };
  downloadedResolution: WallTextureQuality;
  md5: WallTextureSet;
};

type WallMaterialEntry = {
  id: string;
  tileSizeM: number;
  tintHex?: string;
  albedoBoost?: number;
  roughness?: number;
  normalScale?: number;
  aoIntensity?: number;
  source?: WallMaterialSource;
  textures: Partial<Record<WallTextureQuality, WallTextureSet>>;
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

function parseTextureSet(value: unknown, context: string): WallTextureSet {
  const record = asRecord(value, context);
  return {
    albedo: asString(record.albedo, `${context}.albedo`),
    normal: asString(record.normal, `${context}.normal`),
    arm: asString(record.arm, `${context}.arm`),
  };
}

function parseOptionalTextureSet(value: unknown, context: string): WallTextureSet | undefined {
  if (value === undefined) return undefined;
  return parseTextureSet(value, context);
}

function parseWallMaterialSource(value: unknown, context: string): WallMaterialSource | undefined {
  if (value === undefined) return undefined;
  const record = asRecord(value, context);
  const nativeDimensions = asRecord(record.nativeDimensionsM, `${context}.nativeDimensionsM`);
  const downloadedResolution = asString(
    record.downloadedResolution,
    `${context}.downloadedResolution`,
  );
  if (downloadedResolution !== "1k" && downloadedResolution !== "2k") {
    throw new Error(`${context}.downloadedResolution: expected '1k' or '2k'`);
  }
  const url = asString(record.url, `${context}.url`);
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "https:") {
      throw new Error("expected HTTPS URL");
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${context}.url: invalid source URL (${detail})`);
  }

  const provider = asString(record.provider, `${context}.provider`);
  const license = asString(record.license, `${context}.license`);
  if (provider === "Poly Haven" && license !== "CC0") {
    throw new Error(`${context}.license: Poly Haven material must declare CC0`);
  }

  const md5 = parseTextureSet(record.md5, `${context}.md5`);
  for (const [mapName, checksum] of Object.entries(md5)) {
    if (!/^[0-9a-f]{32}$/.test(checksum)) {
      throw new Error(`${context}.md5.${mapName}: expected lowercase MD5 checksum`);
    }
  }

  return {
    provider,
    assetId: asString(record.assetId, `${context}.assetId`),
    url,
    license,
    nativeDimensionsM: {
      width: asNumberInRange(nativeDimensions.width, `${context}.nativeDimensionsM.width`, 0.05, 64),
      height: asNumberInRange(nativeDimensions.height, `${context}.nativeDimensionsM.height`, 0.05, 64),
    },
    downloadedResolution,
    md5,
  };
}

export function resolveWallTextureSetForQuality(
  textures: Partial<Record<WallTextureQuality, WallTextureSet>>,
  quality: WallTextureQuality,
  allowUpscale = true,
): { quality: WallTextureQuality; textures: WallTextureSet } {
  const preferredQualities: readonly WallTextureQuality[] = allowUpscale
    ? quality === "1k"
      ? ["1k", "2k"]
      : ["2k", "1k"]
    : quality === "1k"
      ? ["1k"]
      : ["2k", "1k"];
  for (const candidate of preferredQualities) {
    const resolved = textures[candidate];
    if (resolved) return { quality: candidate, textures: resolved };
  }
  const policy = allowUpscale ? "supported" : "equal-or-lower";
  throw new Error(`Material is missing an ${policy} wall texture variant for requested quality '${quality}'`);
}

function parseEntry(value: unknown, index: number): WallMaterialEntry {
  const context = `materials[${index}]`;
  const record = asRecord(value, context);
  const texturesRaw = asRecord(record.textures, `${context}.textures`);

  const tintHex = asOptionalString(record.tintHex, `${context}.tintHex`);
  const albedoBoost = asOptionalNumberInRange(record.albedoBoost, `${context}.albedoBoost`, 0, 2);
  const roughness = asOptionalNumberInRange(record.roughness, `${context}.roughness`, 0, 1);
  const normalScale = asOptionalNumberInRange(record.normalScale, `${context}.normalScale`, 0, 1);
  const aoIntensity = asOptionalNumberInRange(record.aoIntensity, `${context}.aoIntensity`, 0, 1);
  const source = parseWallMaterialSource(record.source, `${context}.source`);
  if (tintHex !== undefined && !/^#[0-9a-fA-F]{6}$/.test(tintHex)) {
    throw new Error(`${context}.tintHex: expected #RRGGBB hex color`);
  }

  const textures: Partial<Record<WallTextureQuality, WallTextureSet>> = {};
  const oneK = parseOptionalTextureSet(texturesRaw["1k"], `${context}.textures.1k`);
  const twoK = parseOptionalTextureSet(texturesRaw["2k"], `${context}.textures.2k`);
  if (oneK) textures["1k"] = oneK;
  if (twoK) textures["2k"] = twoK;
  if (!oneK && !twoK) {
    throw new Error(`${context}.textures: expected at least one of 1k or 2k`);
  }
  if (source && !textures[source.downloadedResolution]) {
    throw new Error(
      `${context}.source.downloadedResolution: '${source.downloadedResolution}' texture set is missing`,
    );
  }

  const entry: WallMaterialEntry = {
    id: asString(record.id, `${context}.id`),
    tileSizeM: asNumberInRange(record.tileSizeM, `${context}.tileSizeM`, 0.05, 64),
    textures,
  };

  if (tintHex !== undefined) entry.tintHex = tintHex;
  if (albedoBoost !== undefined) entry.albedoBoost = albedoBoost;
  if (roughness !== undefined) entry.roughness = roughness;
  if (normalScale !== undefined) entry.normalScale = normalScale;
  if (aoIntensity !== undefined) entry.aoIntensity = aoIntensity;
  if (source !== undefined) entry.source = source;
  return entry;
}

export function parseWallMaterialManifest(value: unknown): WallMaterialEntry[] {
  const root = asRecord(value, "materials.json");
  if (!Array.isArray(root.materials) || root.materials.length === 0) {
    throw new Error("materials.json.materials must be a non-empty array");
  }

  const parsed = root.materials.map((entry, index) => parseEntry(entry, index));
  const seenIds = new Set<string>();
  for (const entry of parsed) {
    if (seenIds.has(entry.id)) {
      throw new Error(`materials.json.materials: duplicate material id '${entry.id}'`);
    }
    seenIds.add(entry.id);
  }
  return parsed;
}

export class WallMaterialLibrary {
  private static readonly textureCache = new Map<string, Promise<Texture>>();
  private static readonly resolvedTextureCache = new Map<string, Texture>();

  private readonly materialIds: string[] = [];
  private readonly materialsById = new Map<string, WallMaterialEntry>();
  private readonly textureLoader = new TextureLoader();

  private constructor(private readonly baseDirUrl: string, materials: WallMaterialEntry[]) {
    for (const material of materials) {
      this.materialIds.push(material.id);
      this.materialsById.set(material.id, material);
    }
  }

  static async load(
    manifestUrl: string,
    options: WallMaterialLoadOptions = {},
  ): Promise<WallMaterialLibrary> {
    const resolvedManifestUrl = new URL(manifestUrl, window.location.href);
    const requestId = `wall-manifest:${resolvedManifestUrl.toString()}`;
    options.requestObserver?.expectChild?.(requestId);
    options.requestObserver?.start(requestId);
    let response: Response;
    try {
      response = await fetch(resolvedManifestUrl.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch wall manifest (${response.status} ${response.statusText})`);
      }
      options.requestObserver?.complete(requestId);
    } catch (error) {
      options.requestObserver?.fail(requestId, error);
      throw error;
    }

    const manifestJson: unknown = await response.json();
    const parsedMaterials = parseWallMaterialManifest(manifestJson);
    const materials = options.materialIds
      ? parsedMaterials.filter((entry) => options.materialIds?.has(entry.id))
      : parsedMaterials;
    if (options.materialIds) {
      const selectedIds = new Set(materials.map((entry) => entry.id));
      const missingIds = [...options.materialIds].filter((id) => !selectedIds.has(id));
      if (missingIds.length > 0) {
        throw new Error(`Required wall materials are missing: ${missingIds.sort().join(", ")}`);
      }
    }
    const baseDirUrl = new URL("./", resolvedManifestUrl).toString();
    return new WallMaterialLibrary(baseDirUrl, materials);
  }

  getMaterialIds(): readonly string[] {
    return this.materialIds;
  }

  getTileSizeM(materialId: string): number {
    const entry = this.materialsById.get(materialId);
    if (!entry) throw new Error(`Wall material '${materialId}' not found`);
    return entry.tileSizeM;
  }

  async preloadAllTextures(
    quality: WallTextureQuality,
    options: WallTexturePreloadOptions = {},
  ): Promise<readonly WallTextureResolution[]> {
    const seenUrls = new Set<string>();
    const preloadTasks: Promise<Texture>[] = [];
    const resolutions: WallTextureResolution[] = [];

    const enqueueTexture = (relativeOrAbsoluteUrl: string, colorSpace: Texture["colorSpace"], aniso: number): void => {
      const resolvedUrl = this.resolveTextureUrl(relativeOrAbsoluteUrl);
      if (seenUrls.has(resolvedUrl)) return;
      seenUrls.add(resolvedUrl);
      const requestId = `wall-texture:${resolvedUrl}`;
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
      const resolution = resolveWallTextureSetForQuality(
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

  createStandardMaterial(materialId: string, quality: WallTextureQuality): MeshStandardMaterial {
    const entry = this.materialsById.get(materialId);
    if (!entry) throw new Error(`Wall material '${materialId}' not found`);

    const maps = resolveWallTextureSetForQuality(entry.textures, quality).textures;
    const material = new MeshStandardMaterial({
      color: entry.tintHex ?? 0xffffff,
      roughness: entry.roughness ?? 0.95,
      metalness: 0,
      normalScale: new Vector2(entry.normalScale ?? 0.55, entry.normalScale ?? 0.55),
    });

    material.userData.wallAlbedoBoost = entry.albedoBoost ?? 1;
    if (!this.applyResolvedMaps(material, entry, maps)) {
      void this.applyMaps(material, entry, maps);
    }
    return material;
  }

  private resolveTextureUrl(relativeOrAbsoluteUrl: string): string {
    return new URL(relativeOrAbsoluteUrl, this.baseDirUrl).toString();
  }

  private async applyMaps(
    material: MeshStandardMaterial,
    entry: WallMaterialEntry,
    maps: WallTextureSet,
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
      console.warn(`[walls] failed to load PBR wall textures: ${detail}`);
    }
  }

  private applyResolvedMaps(
    material: MeshStandardMaterial,
    entry: WallMaterialEntry,
    maps: WallTextureSet,
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
    return WallMaterialLibrary.resolvedTextureCache.get(resolvedUrl) ?? null;
  }

  private assignMaps(
    material: MeshStandardMaterial,
    entry: WallMaterialEntry,
    albedoTex: Texture,
    normalTex: Texture,
    armTex: Texture,
  ): void {
    material.map = albedoTex;
    material.normalMap = normalTex;
    material.aoMap = armTex;
    material.aoMapIntensity = entry.aoIntensity ?? 0.55;
    material.roughnessMap = armTex;
    material.metalnessMap = armTex;
    material.needsUpdate = true;
  }

  private loadTexture(url: string, colorSpace: Texture["colorSpace"], aniso = 8): Promise<Texture> {
    const resolvedUrl = this.resolveTextureUrl(url);
    let promise = WallMaterialLibrary.textureCache.get(resolvedUrl);
    if (!promise) {
      promise = this.textureLoader.loadAsync(resolvedUrl).then((texture) => {
        texture.colorSpace = colorSpace;
        texture.wrapS = RepeatWrapping;
        texture.wrapT = RepeatWrapping;
        texture.anisotropy = aniso;
        texture.needsUpdate = true;
        WallMaterialLibrary.resolvedTextureCache.set(resolvedUrl, texture);
        return texture;
      }).catch((error: unknown) => {
        WallMaterialLibrary.textureCache.delete(resolvedUrl);
        WallMaterialLibrary.resolvedTextureCache.delete(resolvedUrl);
        throw error;
      });
      WallMaterialLibrary.textureCache.set(resolvedUrl, promise);
    }
    return promise;
  }
}
