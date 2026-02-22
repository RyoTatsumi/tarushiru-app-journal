export async function callWithRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxRetries = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      const status = (error as { status?: number })?.status || 0;
      console.warn(`[${context}] Attempt ${attempt + 1}/${maxRetries} failed:`, error);

      if (attempt < maxRetries - 1 && (status === 429 || status === 529 || status >= 500)) {
        const delay = 2000 * Math.pow(2, attempt);
        console.log(`[${context}] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        break;
      }
    }
  }
  throw lastError;
}
