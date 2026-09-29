import { asRecord, asString } from "../materials/pbrManifest";
import { Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { disposeObjectRoot } from "../../utils/disposeObjectRoot";
import { createSharedTextureLoadingManager } from "./sharedGltfTextures";

type PropModelManifestEntry = {
  id: string;
  url: string;
  scale: number;
};

export type PropModelLoadOptions = {
  modelIds?: ReadonlySet<string>;
  concurrency?: number;
  requestObserver?: {
    expectChild?: (id: string) => void;
    start: (id: string) => void;
    complete: (id: string) => void;
    fail: (id: string, error: unknown) => void;
  };
};

/**
 * Warm albedo corrections for CC0 props whose source textures were authored for
 * a dim interior. The crate and the barrel are the bazaar's most repeated
 * timber props and both shipped near-black against sunlit limestone paving, so
 * the grounding closeup read as charcoal boxes rather than the honey-toned
 * softwood the reference shows. Multiplying the base colour keeps every texture
 * detail, wear pattern and normal response and only lifts the exposure the
 * source bakes in. Values stay per-channel so the lift is warm, not grey.
 */
const PROP_MODEL_ALBEDO_CORRECTION: Readonly<Record<string, readonly [number, number, number]>> = {
  ph_wooden_crate_01: [1.92, 1.66, 1.34],
  ph_wine_barrel_01: [1.86, 1.6, 1.3],
};

function asOptionalNumber(value: unknown, context: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}: expected finite number`);
  }
  return value;
}

function parsePropModelManifest(value: unknown): PropModelManifestEntry[] {
  const root = asRecord(value, "models.json");
  const rawModels = root.models;
  if (!Array.isArray(rawModels)) {
    throw new Error("models.json.models must be an array");
  }

  return rawModels.map((item, index) => {
    const model = asRecord(item, `models[${index}]`);
    return {
      id: asString(model.id, `models[${index}].id`),
      url: asString(model.url, `models[${index}].url`),
      scale: Math.max(0.001, asOptionalNumber(model.scale, `models[${index}].scale`) ?? 1),
    };
  });
}

export class PropModelLibrary {
  private readonly templatesById: Map<string, Group>;

  private constructor(templatesById: Map<string, Group>) {
    this.templatesById = templatesById;
  }

  static async load(
    manifestUrl: string,
    options: PropModelLoadOptions = {},
  ): Promise<PropModelLibrary> {
    const resolvedManifestUrl = new URL(manifestUrl, window.location.href);
    const manifestRequestId = `model-manifest:${resolvedManifestUrl.toString()}`;
    options.requestObserver?.expectChild?.(manifestRequestId);
    options.requestObserver?.start(manifestRequestId);
    let response: Response;
    try {
      response = await fetch(resolvedManifestUrl.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch prop manifest (${response.status} ${response.statusText})`);
      }
      options.requestObserver?.complete(manifestRequestId);
    } catch (error) {
      options.requestObserver?.fail(manifestRequestId, error);
      throw error;
    }

    const manifestJson: unknown = await response.json();
    const parsedEntries = parsePropModelManifest(manifestJson);
    const entries = options.modelIds
      ? parsedEntries.filter((entry) => options.modelIds?.has(entry.id))
      : parsedEntries;
    if (options.modelIds) {
      const selectedIds = new Set(entries.map((entry) => entry.id));
      const missingIds = [...options.modelIds].filter((id) => !selectedIds.has(id));
      if (missingIds.length > 0) {
        throw new Error(`Required registered prop models are missing: ${missingIds.sort().join(", ")}`);
      }
    }
    // Image URIs resolve through one cache shared by every library, so a finish
    // used by many facade GLBs is fetched, decoded and uploaded once.
    const loader = new GLTFLoader(createSharedTextureLoadingManager());
    const templatesById = new Map<string, Group>();

    let nextEntryIndex = 0;
    const loadNext = async (): Promise<void> => {
      while (nextEntryIndex < entries.length) {
        const entry = entries[nextEntryIndex++]!;
        const resolvedModelUrl = new URL(entry.url, resolvedManifestUrl).toString();
        const requestId = `model:${entry.id}:${resolvedModelUrl}`;
        options.requestObserver?.expectChild?.(requestId);
        options.requestObserver?.start(requestId);
        let gltf;
        try {
          gltf = await loader.loadAsync(resolvedModelUrl);
          options.requestObserver?.complete(requestId);
        } catch (error) {
          options.requestObserver?.fail(requestId, error);
          throw error;
        }
        const root = new Group();
        root.name = `prop-template-${entry.id}`;

        const source = gltf.scene;
        root.userData = { ...source.userData };
        if (entry.scale !== 1) {
          source.scale.multiplyScalar(entry.scale);
        }

        const albedoCorrection = PROP_MODEL_ALBEDO_CORRECTION[entry.id];
        const correctedMaterials = new Set<object>();
        source.traverse((node) => {
          const mesh = node as {
            isMesh?: boolean;
            castShadow?: boolean;
            receiveShadow?: boolean;
            material?: unknown;
          };
          if (!mesh.isMesh) return;
          mesh.castShadow = node.userData.bz04Shadow !== "receive";
          mesh.receiveShadow = true;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of materials) {
            if (!material || typeof material !== "object") continue;
            const pbrMaterial = material as {
              isMeshStandardMaterial?: boolean;
              userData?: Record<string, unknown>;
              color?: { r: number; g: number; b: number };
              needsUpdate?: boolean;
            };
            if (pbrMaterial.isMeshStandardMaterial !== true || !pbrMaterial.userData) continue;
            pbrMaterial.userData.propModelId = entry.id;
            // GLTFLoader leaves embedded textures at anisotropy 1, which blurs every
            // receding facade and paving plane long before its mip level should.
            // Three clamps this to the device limit at upload.
            for (const slot of ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap"] as const) {
              const texture = (material as Partial<Record<typeof slot, { anisotropy: number } | null>>)[slot];
              if (texture) texture.anisotropy = 16;
            }
            if (!albedoCorrection || !pbrMaterial.color) continue;
            // Templates are instanced, so each material is corrected once.
            if (correctedMaterials.has(pbrMaterial)) continue;
            correctedMaterials.add(pbrMaterial);
            pbrMaterial.color.r *= albedoCorrection[0];
            pbrMaterial.color.g *= albedoCorrection[1];
            pbrMaterial.color.b *= albedoCorrection[2];
            pbrMaterial.needsUpdate = true;
          }
        });

        root.add(source);
        templatesById.set(entry.id, root);
      }
    };
    const requestedConcurrency = options.concurrency ?? Math.max(1, entries.length);
    const concurrency = Math.max(1, Math.min(entries.length || 1, Math.floor(requestedConcurrency)));
    await Promise.all(Array.from({ length: concurrency }, () => loadNext()));

    return new PropModelLibrary(templatesById);
  }

  hasModel(id: string): boolean {
    return this.templatesById.has(id);
  }

  getModelCount(): number {
    return this.templatesById.size;
  }

  instantiate(id: string): Group {
    const template = this.templatesById.get(id);
    if (!template) {
      throw new Error(`Prop model '${id}' is not available`);
    }
    const clone = template.clone(true);
    clone.traverse((node) => {
      const mesh = node as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean };
      if (!mesh.isMesh) return;
      mesh.castShadow = node.userData.bz04Shadow !== "receive";
      mesh.receiveShadow = true;
    });
    return clone;
  }

  dispose(): void {
    for (const template of this.templatesById.values()) {
      disposeObjectRoot(template);
      template.clear();
    }
    this.templatesById.clear();
  }
}
