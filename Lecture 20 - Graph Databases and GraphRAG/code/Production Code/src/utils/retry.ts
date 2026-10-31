/**
 * p-retry-compatible retry helper (dependency-free).
 * Retries an async operation with exponential backoff.
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: { maxAttempts: number; factor: number; minTimeout: number }
): Promise<T> {
  let lastError: Error;
  const { maxAttempts = 3, factor = 2, minTimeout = 1000 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err as Error;
      if (attempt === maxAttempts) break;

      const waitTime = minTimeout * factor ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
}