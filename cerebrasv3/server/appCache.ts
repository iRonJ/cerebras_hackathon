/**
 * AppCache - Lightweight server-side app caching
 * 
 * Stores minimal app metadata (id, prompt) to keep context lengths manageable.
 * Full app details can be requested on-demand when needed for updates.
 */

export interface CachedAppMeta {
    id: string;
    sessionId: string;
    prompt: string;
    isLiveUpdating: boolean;
    lastUpdated: number;
    toolsUsed: string[];
}

export interface CachedAppFull extends CachedAppMeta {
    html: string;
    js?: string;
    css?: string;
}

export class AppCache {
    private apps: Map<string, CachedAppFull> = new Map();

    /**
     * Get just the metadata for an app (lightweight for context)
     */
    getMeta(appId: string): CachedAppMeta | undefined {
        const app = this.apps.get(appId);
        if (!app) return undefined;

        // Return only metadata, exclude html/js/css
        const { html, js, css, ...meta } = app;
        return meta;
    }

    /**
     * Get full app details (for updates or spawning instances)
     */
    getFull(appId: string): CachedAppFull | undefined {
        return this.apps.get(appId);
    }

    /**
     * Store an app in the cache
     */
    set(app: CachedAppFull): void {
        this.apps.set(app.id, { ...app, lastUpdated: Date.now() });
    }

    /**
     * Update just the content of an existing app
     */
    updateContent(appId: string, html: string, js?: string, css?: string): boolean {
        const app = this.apps.get(appId);
        if (!app) return false;

        app.html = html;
        if (js !== undefined) app.js = js;
        if (css !== undefined) app.css = css;
        app.lastUpdated = Date.now();
        return true;
    }

    /**
     * Get lightweight metadata list for a session (for AI context)
     */
    getSessionMeta(sessionId: string): CachedAppMeta[] {
        const results: CachedAppMeta[] = [];
        for (const app of this.apps.values()) {
            if (app.sessionId === sessionId) {
                const { html, js, css, ...meta } = app;
                results.push(meta);
            }
        }
        return results;
    }

    /**
     * Get full apps for a session (when needed for updates)
     */
    getSessionFull(sessionId: string): CachedAppFull[] {
        return Array.from(this.apps.values()).filter(app => app.sessionId === sessionId);
    }

    /**
     * Remove an app from cache
     */
    remove(appId: string): boolean {
        return this.apps.delete(appId);
    }

    /**
     * Remove apps not in the active list (frontend sync)
     * Returns the apps that were removed
     */
    removeStale(activeIds: string[]): CachedAppFull[] {
        const activeSet = new Set(activeIds);
        const removed: CachedAppFull[] = [];

        for (const [id, app] of this.apps.entries()) {
            if (!activeSet.has(id)) {
                removed.push(app);
                this.apps.delete(id);
            }
        }
        return removed;
    }

    /**
     * Get all live-updating apps (for background loop)
     */
    getLiveUpdatingApps(): CachedAppFull[] {
        return Array.from(this.apps.values()).filter(app => app.isLiveUpdating);
    }

    /**
     * Get all app IDs
     */
    getAllIds(): string[] {
        return Array.from(this.apps.keys());
    }

    /**
     * Get count of cached apps
     */
    get size(): number {
        return this.apps.size;
    }
}

// Singleton instance for the server
export const appCache = new AppCache();
