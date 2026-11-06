/** Timed-out speculative work retains ownership of any result it finishes later. */
export async function waitForWarmupBeforeDeadline<T>(
  pending: Promise<T>,
  timeoutMs: number,
  onLateResult: (result: T) => void,
): Promise<T | null> {
  let expired = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const observed = pending.then((result) => {
    if (expired) {
      onLateResult(result);
      return null;
    }
    return result;
  });
  try {
    return await Promise.race([
      observed,
      new Promise<null>((resolve) => {
        timeoutId = setTimeout(() => {
          expired = true;
          resolve(null);
        }, timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}
