type Atomic = string | number | boolean | bigint | symbol | null | undefined;

/** Compile-time counterpart to the runtime deep freeze applied to every profile. */
export type DeepReadonly<T> =
  T extends Atomic ? T
    : T extends readonly unknown[] ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

export function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value as DeepReadonly<T>;
  }

  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value) as DeepReadonly<T>;
}
