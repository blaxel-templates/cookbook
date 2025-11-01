/**
 * Utility functions for handling base path in production environments.
 * The base path is injected by nginx via window.__BASE_PATH__
 */

declare global {
  interface Window {
    __BASE_PATH__?: string;
  }
}

/**
 * Get the base path for the application.
 * Returns empty string in development, or the injected base path in production.
 */
export function getBasePath(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.__BASE_PATH__ || '';
}

/**
 * Prepend the base path to a URL.
 * @param path - The path to prepend the base path to (should start with /)
 * @returns The path with base path prepended
 */
export function withBasePath(path: string): string {
  const basePath = getBasePath();

  // Don't prepend if path already starts with base path
  if (basePath && path.startsWith(basePath)) {
    return path;
  }

  // Don't prepend for external URLs
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    return path;
  }

  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${basePath}${normalizedPath}`;
}

/**
 * Enhanced fetch that automatically prepends the base path to relative URLs.
 * Use this instead of the native fetch when making API calls.
 */
export async function fetchWithBasePath(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  let url: string;

  if (typeof input === 'string') {
    url = withBasePath(input);
  } else if (input instanceof URL) {
    url = input.toString();
  } else {
    // It's a Request object
    url = withBasePath(input.url);
  }

  return fetch(url, init);
}

/**
 * Enhanced router navigation that automatically prepends the base path.
 * Use this wrapper when using Next.js router.push().
 *
 * @example
 * import { useRouter } from 'next/navigation';
 * import { navigateWithBasePath } from '@/lib/basePath';
 *
 * const router = useRouter();
 * navigateWithBasePath(router, '/projects/123');
 */
export function navigateWithBasePath(
  router: { push: (href: string) => void },
  path: string
): void {
  router.push(withBasePath(path));
}

