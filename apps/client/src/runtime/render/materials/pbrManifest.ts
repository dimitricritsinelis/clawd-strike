export type PbrTextureSet = { albedo: string; normal: string; arm: string };

type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown, context: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context}: expected object`);
  }
  return value as UnknownRecord;
}

export function asString(value: unknown, context: string): string {
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

export function asNumberInRange(value: unknown, context: string, min: number, max: number): number {
  const parsed = asNumber(value, context);
  if (parsed < min || parsed > max) {
    throw new Error(`${context}: expected number in range [${min}, ${max}]`);
  }
  return parsed;
}

export function asOptionalNumberInRange(
  value: unknown,
  context: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined;
  return asNumberInRange(value, context, min, max);
}

export function asOptionalString(value: unknown, context: string): string | undefined {
  if (value === undefined) return undefined;
  return asString(value, context);
}

export function parseTextureSet(value: unknown, context: string): PbrTextureSet {
  const record = asRecord(value, context);
  const albedo = asString(record.albedo, `${context}.albedo`);
  const normal = asString(record.normal, `${context}.normal`);
  const arm = asString(record.arm, `${context}.arm`);
  return { albedo, normal, arm };
}

export function parseOptionalTextureSet(value: unknown, context: string): PbrTextureSet | undefined {
  if (value === undefined) return undefined;
  return parseTextureSet(value, context);
}
