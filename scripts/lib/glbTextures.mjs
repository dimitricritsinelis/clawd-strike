// Moves images embedded in a GLB into shared, content-addressed files.
//
// Area builds bake every finish into each GLB, so the same 1k maps were shipped
// hundreds of times: the installed facades held 1,144 images of which 140 were
// unique (1.36 GB for 163 MB of data), and each copy was decoded and uploaded to
// the GPU separately. The runtime loads each shared file once and shares its GPU
// upload across models (render/models/sharedGltfTextures.ts).
//
// The transform is deterministic and lossless: image bytes are written
// unchanged, geometry buffers are copied byte for byte, and a GLB with no
// embedded images is returned as is.
import { createHash } from "node:crypto";

const GLB_MAGIC = 0x46546c67;
const CHUNK_JSON = 0x4e4f534a;
const CHUNK_BIN = 0x004e4942;
const EXTENSION_BY_MIME = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function parseGlb(bytes) {
  if (bytes.readUInt32LE(0) !== GLB_MAGIC) throw new Error("not a GLB");
  let offset = 12;
  let json = null;
  let bin = null;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === CHUNK_JSON) json = JSON.parse(data.toString("utf8"));
    else if (type === CHUNK_BIN && bin === null) bin = data;
    offset += 8 + length;
  }
  if (!json) throw new Error("GLB has no JSON chunk");
  return { json, bin };
}

export function writeGlb(json, bin) {
  const jsonBytes = Buffer.from(JSON.stringify(json), "utf8");
  const jsonPadded = Buffer.concat([jsonBytes, Buffer.alloc((4 - (jsonBytes.length % 4)) % 4, 0x20)]);
  const chunks = [chunkHeader(jsonPadded.length, CHUNK_JSON), jsonPadded];
  if (bin && bin.length > 0) {
    const binPadded = Buffer.concat([bin, Buffer.alloc((4 - (bin.length % 4)) % 4, 0)]);
    chunks.push(chunkHeader(binPadded.length, CHUNK_BIN), binPadded);
  }
  const body = Buffer.concat(chunks);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(GLB_MAGIC, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + body.length, 8);
  return Buffer.concat([header, body]);
}

function chunkHeader(length, type) {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(length, 0);
  header.writeUInt32LE(type, 4);
  return header;
}

/** Content address for a shared texture file. */
export function sharedTextureName(bytes, mimeType) {
  const extension = EXTENSION_BY_MIME[mimeType];
  if (!extension) throw new Error(`unsupported embedded image type ${mimeType}`);
  return `${createHash("sha256").update(bytes).digest("hex").slice(0, 32)}.${extension}`;
}

/**
 * @param {Buffer} bytes GLB file
 * @param {string} uriPrefix relative path from the GLB to the shared texture directory, ending in "/"
 * @returns {{ glb: Buffer, textures: Map<string, Buffer>, changed: boolean }}
 */
export function externalizeGlbImages(bytes, uriPrefix) {
  const { json, bin } = parseGlb(bytes);
  const images = json.images ?? [];
  const textures = new Map();
  for (const image of images) {
    if (image.uri?.startsWith(uriPrefix)) textures.set(image.uri.slice(uriPrefix.length), null);
  }
  const embedded = images.filter((image) => image.bufferView !== undefined);
  if (embedded.length === 0) return { glb: bytes, textures, changed: false };
  if ((json.buffers ?? []).length !== 1 || json.buffers[0].uri !== undefined || !bin) {
    throw new Error("expected one embedded GLB buffer");
  }

  const imageViews = new Set();
  for (const image of embedded) {
    const view = json.bufferViews[image.bufferView];
    const data = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const name = sharedTextureName(data, image.mimeType);
    textures.set(name, Buffer.from(data));
    imageViews.add(image.bufferView);
    delete image.bufferView;
    image.uri = `${uriPrefix}${name}`;
  }
  // An image view is dropped only when nothing else points at it.
  const referenced = new Set();
  for (const accessor of json.accessors ?? []) {
    if (accessor.bufferView !== undefined) referenced.add(accessor.bufferView);
    if (accessor.sparse) {
      referenced.add(accessor.sparse.indices.bufferView);
      referenced.add(accessor.sparse.values.bufferView);
    }
  }
  for (const image of images) if (image.bufferView !== undefined) referenced.add(image.bufferView);
  if (json.extensionsUsed?.some((name) => /draco|meshopt/i.test(name))) {
    throw new Error(`compressed extensions are not supported: ${json.extensionsUsed.join(", ")}`);
  }

  // Compact the binary chunk, keeping every surviving view's alignment.
  const remap = new Map();
  const parts = [];
  const views = [];
  let length = 0;
  json.bufferViews.forEach((view, index) => {
    if (imageViews.has(index) && !referenced.has(index)) return;
    const padding = (8 - (length % 8)) % 8;
    if (padding) parts.push(Buffer.alloc(padding));
    length += padding;
    const start = view.byteOffset ?? 0;
    parts.push(bin.subarray(start, start + view.byteLength));
    remap.set(index, views.length);
    views.push({ ...view, byteOffset: length });
    length += view.byteLength;
  });
  json.bufferViews = views;
  for (const accessor of json.accessors ?? []) {
    if (accessor.bufferView !== undefined) accessor.bufferView = remap.get(accessor.bufferView);
    if (accessor.sparse) {
      accessor.sparse.indices.bufferView = remap.get(accessor.sparse.indices.bufferView);
      accessor.sparse.values.bufferView = remap.get(accessor.sparse.values.bufferView);
    }
  }
  for (const image of images) if (image.bufferView !== undefined) image.bufferView = remap.get(image.bufferView);
  const newBin = Buffer.concat(parts);
  json.buffers[0].byteLength = newBin.length;
  if (json.bufferViews.length === 0) {
    delete json.bufferViews;
    json.buffers = [];
  }
  const glb = writeGlb(json, newBin);
  assertSameAccessors(bytes, glb);
  return { glb, textures, changed: true };
}

/** Every accessor must read the same bytes after compaction. */
export function assertSameAccessors(beforeBytes, afterBytes) {
  const before = parseGlb(beforeBytes);
  const after = parseGlb(afterBytes);
  const read = ({ json, bin }, accessor) => {
    if (accessor.bufferView === undefined) return Buffer.alloc(0);
    const view = json.bufferViews[accessor.bufferView];
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    return bin.subarray(start, start + (view.byteLength - (accessor.byteOffset ?? 0)));
  };
  const count = (before.json.accessors ?? []).length;
  if (count !== (after.json.accessors ?? []).length) throw new Error("accessor count changed");
  for (let index = 0; index < count; index += 1) {
    const a = read(before, before.json.accessors[index]);
    const b = read(after, after.json.accessors[index]);
    if (!a.equals(b)) throw new Error(`accessor ${index} changed during texture externalization`);
  }
}

/** Shared texture files a GLB references through `uriPrefix`. */
export function glbSharedTextures(bytes, uriPrefix) {
  const { json } = parseGlb(bytes);
  return [...new Set((json.images ?? [])
    .map((image) => image.uri)
    .filter((uri) => typeof uri === "string" && uri.startsWith(uriPrefix))
    .map((uri) => uri.slice(uriPrefix.length)))].sort();
}
