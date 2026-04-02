interface RetryOptions {
  retries?: number;
  delayMs?: number;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function runWithRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? 1;
  const delayMs = options.delayMs ?? 300;

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }

      await wait(delayMs * (attempt + 1));
      attempt += 1;
    }
  }

  throw lastError;
}
