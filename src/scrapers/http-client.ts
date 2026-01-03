import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface RetryOptions {
  retries?: number;
  backoffMs?: number;
  maxBackoffMs?: number;
  logger?: Pick<Console, 'warn'>;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'logger'>> = {
  retries: 3,
  backoffMs: 500,
  maxBackoffMs: 4000,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithRetry<T = unknown>(
  url: string,
  config: AxiosRequestConfig = {},
  options: RetryOptions = {},
): Promise<AxiosResponse<T>> {
  const { retries, backoffMs, maxBackoffMs } = { ...DEFAULT_OPTIONS, ...options };
  const logger = options.logger ?? console;

  let attempt = 0;
  // We allow the initial attempt plus the configured retry count
  const maxAttempts = Math.max(retries, 0) + 1;
  let lastError: AxiosError | Error | undefined;

  while (attempt < maxAttempts) {
    try {
      return await axios.request<T>({ url, method: 'GET', ...config });
    } catch (error) {
      lastError = axios.isAxiosError(error) ? (error as AxiosError) : (error as Error);
      attempt += 1;

      if (attempt >= maxAttempts) {
        break;
      }

      const status = axios.isAxiosError(lastError) ? lastError.response?.status : undefined;
      const waitMs = Math.min(backoffMs * Math.pow(2, attempt - 1), maxBackoffMs);
      const statusLabel = status ? `status ${status}` : 'network error';

      logger.warn?.(
        `Request to ${url} failed (${statusLabel}). Retrying in ${waitMs}ms... (attempt ${attempt + 1}/${maxAttempts})`,
      );
      await delay(waitMs);
    }
  }

  throw lastError ?? new Error(`Request to ${url} failed after ${maxAttempts} attempts.`);
}
