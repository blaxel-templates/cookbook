import { SandboxInstance } from "@blaxel/core";

interface CacheEntry {
  sandbox: SandboxInstance;
  lastAccessed: number;
}

class SandboxCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CHECK_INTERVAL = 60 * 1000; // Check every minute
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Get or create a sandbox instance
   */
  async get(sandboxId: string, forceUrl?: string): Promise<SandboxInstance> {
    const cacheKey = forceUrl || sandboxId;
    const now = Date.now();

    // Check if we have a cached instance
    const cached = this.cache.get(cacheKey);
    if (cached) {
      // Update last accessed time
      cached.lastAccessed = now;
      console.log(`[SandboxCache] Cache HIT for ${cacheKey}`);
      return cached.sandbox;
    }

    console.log(`[SandboxCache] Cache MISS for ${cacheKey}`);

    // Create new instance
    let sandbox: SandboxInstance;
    if (forceUrl) {
      sandbox = new SandboxInstance({ forceUrl, metadata: { name: sandboxId }, spec: {}});
    } else {
      sandbox = await SandboxInstance.get(sandboxId);
    }

    // Store in cache
    this.cache.set(cacheKey, {
      sandbox,
      lastAccessed: now,
    });

    return sandbox;
  }

  /**
   * Manually set a sandbox instance in cache
   */
  set(sandboxId: string, sandbox: SandboxInstance, forceUrl?: string): void {
    const cacheKey = forceUrl || sandboxId;
    const now = Date.now();

    this.cache.set(cacheKey, {
      sandbox,
      lastAccessed: now,
    });

    console.log(`[SandboxCache] Manually cached ${cacheKey}`);
  }

  /**
   * Invalidate a specific sandbox from cache
   */
  invalidate(sandboxId: string): void {
    this.cache.delete(sandboxId);
    console.log(`[SandboxCache] Invalidated ${sandboxId}`);
  }

  /**
   * Clear all cached sandboxes
   */
  clear(): void {
    this.cache.clear();
    console.log(`[SandboxCache] Cleared all cache`);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }

  /**
   * Start cleanup interval to remove stale entries
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CHECK_INTERVAL);

    // Ensure cleanup timer doesn't prevent process from exiting
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Clean up stale cache entries
   */
  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.lastAccessed > this.TTL) {
        toDelete.push(key);
      }
    }

    if (toDelete.length > 0) {
      console.log(`[SandboxCache] Cleaning up ${toDelete.length} stale entries`);
      for (const key of toDelete) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stop cleanup interval
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Export singleton instance
export const sandboxCache = new SandboxCache();

