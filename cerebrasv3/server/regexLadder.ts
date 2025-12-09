/**
 * RegexLadder - AI-populated regex patterns for fast-path request matching
 * 
 * The AI agent populates these patterns when creating new tools.
 * Patterns are stored alongside their tool definitions for quick matching.
 */

import fs from 'fs';
import path from 'path';

export interface RegexPattern {
    pattern: string;           // Regex pattern as string (for AI generation and persistence)
    toolName: string;          // Name of the tool to execute
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | '*';  // HTTP method filter
    argMapping: Record<string, string>;  // Maps capture groups to arg names, e.g. { "1": "path", "2": "format" }
    priority: number;          // Lower = higher priority (for ordering)
    description?: string;      // Human-readable description for AI context
}

interface CompiledPattern extends RegexPattern {
    compiled: RegExp;
}

export class RegexLadder {
    private patterns: CompiledPattern[] = [];
    private persistPath: string;

    constructor(serverRoot: string) {
        this.persistPath = path.join(serverRoot, 'regexPatterns.json');
        this.loadPatterns();
    }

    /**
     * Load patterns from persistent storage
     */
    private loadPatterns(): void {
        if (!fs.existsSync(this.persistPath)) {
            // Initialize with some default patterns from existing tools
            this.initializeDefaults();
            return;
        }

        try {
            const data = fs.readFileSync(this.persistPath, 'utf-8');
            const patterns: RegexPattern[] = JSON.parse(data);
            this.patterns = patterns.map(p => this.compilePattern(p));
            this.sortPatterns();
            console.log(`[RegexLadder] Loaded ${this.patterns.length} patterns`);
        } catch (e) {
            console.error('[RegexLadder] Failed to load patterns:', e);
            this.initializeDefaults();
        }
    }

    /**
     * Initialize with default patterns based on existing tools
     */
    private initializeDefaults(): void {
        const defaults: RegexPattern[] = [
            {
                pattern: '^/api/mono/get_files(?:\\?path=(.+))?$',
                toolName: 'get_files_tool',
                method: 'GET',
                argMapping: { '1': 'path' },
                priority: 10,
                description: 'List files in a directory'
            },
            {
                pattern: '^/api/mono/shell_executor$',
                toolName: 'shell_executor',
                method: 'POST',
                argMapping: {},  // Args come from body
                priority: 10,
                description: 'Execute shell commands'
            },
            {
                pattern: '^/api/mono/file-browser(?:\\?.*)?$',
                toolName: 'file-browser',
                method: '*',
                argMapping: {},
                priority: 10,
                description: 'File browser operations'
            },
            {
                pattern: '^/api/mono/([a-z_]+)$',
                toolName: '$1',  // Dynamic tool name from capture group
                method: '*',
                argMapping: {},
                priority: 100,  // Lower priority - catch-all for known tools
                description: 'Generic tool endpoint matcher'
            }
        ];

        this.patterns = defaults.map(p => this.compilePattern(p));
        this.sortPatterns();
        this.persistPatterns();
    }

    /**
     * Compile a regex pattern
     */
    private compilePattern(pattern: RegexPattern): CompiledPattern {
        return {
            ...pattern,
            compiled: new RegExp(pattern.pattern, 'i')
        };
    }

    /**
     * Sort patterns by priority
     */
    private sortPatterns(): void {
        this.patterns.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Persist patterns to disk
     */
    private persistPatterns(): void {
        const data = this.patterns.map(({ compiled, ...rest }) => rest);
        fs.writeFileSync(this.persistPath, JSON.stringify(data, null, 2));
    }

    /**
     * Match a request against the regex ladder
     * Returns the matched tool and extracted arguments, or null if no match
     */
    match(method: string, path: string, query: Record<string, any> = {}, body: any = {}): {
        toolName: string;
        args: Record<string, string>;
        pattern: RegexPattern;
    } | null {
        for (const pattern of this.patterns) {
            // Check method filter
            if (pattern.method && pattern.method !== '*' && pattern.method !== method.toUpperCase()) {
                continue;
            }

            const match = path.match(pattern.compiled);
            if (!match) continue;

            // Extract tool name (may use capture group placeholder)
            let toolName = pattern.toolName;
            if (toolName.startsWith('$')) {
                const groupIndex = parseInt(toolName.slice(1), 10);
                toolName = match[groupIndex] || toolName;
            }

            // Extract arguments from capture groups
            const args: Record<string, string> = {};
            for (const [groupIndex, argName] of Object.entries(pattern.argMapping)) {
                const idx = parseInt(groupIndex, 10);
                if (match[idx]) {
                    args[argName] = decodeURIComponent(match[idx]);
                }
            }

            // Merge query params and body as additional args
            Object.assign(args, query);
            if (typeof body === 'object' && body !== null) {
                Object.assign(args, body);
            }

            console.log(`[RegexLadder] Matched pattern for ${toolName}:`, { path, args });
            return { toolName, args, pattern };
        }

        return null;
    }

    /**
     * Add a new pattern (called by AI when creating new tools)
     */
    addPattern(pattern: Omit<RegexPattern, 'priority'> & { priority?: number }): void {
        const fullPattern: RegexPattern = {
            ...pattern,
            priority: pattern.priority ?? 50
        };

        // Remove any existing pattern for the same tool
        this.patterns = this.patterns.filter(p => p.toolName !== pattern.toolName);

        this.patterns.push(this.compilePattern(fullPattern));
        this.sortPatterns();
        this.persistPatterns();
        console.log(`[RegexLadder] Added pattern for tool: ${pattern.toolName}`);
    }

    /**
     * Remove a pattern by tool name
     */
    removePattern(toolName: string): boolean {
        const before = this.patterns.length;
        this.patterns = this.patterns.filter(p => p.toolName !== toolName);
        if (this.patterns.length !== before) {
            this.persistPatterns();
            return true;
        }
        return false;
    }

    /**
     * Get all patterns (for AI context)
     */
    getAllPatterns(): RegexPattern[] {
        return this.patterns.map(({ compiled, ...rest }) => rest);
    }

    /**
     * Generate a pattern suggestion from a tool definition (for AI assistance)
     */
    static suggestPattern(toolName: string, apiEndpoint: string): Partial<RegexPattern> {
        // Escape special regex characters in the endpoint
        const escaped = apiEndpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return {
            pattern: `^${escaped}(?:\\?.*)?$`,
            toolName,
            method: '*',
            argMapping: {},
            priority: 50
        };
    }
}
