import { Group } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { disposeObjectRoot } from "../../utils/disposeObjectRoot";

type UnknownRecord = Record<string, unknown>;

export type PropModelQuality = "1k";

export type PropModelManifestEntry = {
  id: string;
  url: string;
  scale: number;
  variants: Partial<Record<PropModelQuality, { url: string }>>;
};

export type PropModelLoadOptions = {
  modelIds?: ReadonlySet<string>;
  concurrency?: number;
  quality?: PropModelQuality;
  requestObserver?: {
    expectChild?: (id: string) => void;
    start: (id: string) => void;
    complete: (id: string) => void;
    fail: (id: string, error: unknown) => void;
  };
};

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

function asOptionalNumber(value: unknown, context: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}: expected finite number`);
  }
  return value;
}

function parseVariants(
  value: unknown,
  context: string,
): PropModelManifestEntry["variants"] {
  if (value === undefined) return {};
  const variants = asRecord(value, context);
  const oneK = variants["1k"];
  if (oneK === undefined) return {};
  const oneKRecord = asRecord(oneK, `${context}.1k`);
  return {
    "1k": {
      url: asString(oneKRecord.url, `${context}.1k.url`),
    },
  };
}

export function parsePropModelManifest(value: unknown): PropModelManifestEntry[] {
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
      variants: parseVariants(model.variants, `models[${index}].variants`),
    };
  });
}

export function resolvePropModelUrlForQuality(
  entry: PropModelManifestEntry,
  quality?: PropModelQuality,
): string {
  if (!quality) return entry.url;
  const variant = entry.variants[quality];
  if (!variant) {
    throw new Error(`Model '${entry.id}' is missing required '${quality}' variant`);
  }
  return variant.url;
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
    const loader = new GLTFLoader();
    const templatesById = new Map<string, Group>();

    let nextEntryIndex = 0;
    const loadNext = async (): Promise<void> => {
      while (nextEntryIndex < entries.length) {
        const entry = entries[nextEntryIndex++]!;
        const selectedUrl = resolvePropModelUrlForQuality(entry, options.quality);
        const resolvedModelUrl = new URL(selectedUrl, resolvedManifestUrl).toString();
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
        if (entry.scale !== 1) {
          source.scale.multiplyScalar(entry.scale);
        }

        source.traverse((node) => {
          const mesh = node as {
            isMesh?: boolean;
            castShadow?: boolean;
            receiveShadow?: boolean;
            material?: unknown;
          };
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of materials) {
            if (!material || typeof material !== "object") continue;
            const pbrMaterial = material as {
              isMeshStandardMaterial?: boolean;
              userData?: Record<string, unknown>;
            };
            if (pbrMaterial.isMeshStandardMaterial !== true || !pbrMaterial.userData) continue;
            pbrMaterial.userData.propModelId = entry.id;
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
      mesh.castShadow = true;
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
