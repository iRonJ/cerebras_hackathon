import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export interface ToolDefinition {
    name: string;
    description: string;
    apiEndpoint: string;
    command: string;
    responseType: 'string' | 'list' | 'json';
    responseSample?: string;
    usage?: string; // Example fetch() call for the frontend
    code?: string; // Content of the script
    language?: 'python' | 'shell';
    pip_packages?: string[];
}

// Path to the venv python - can be overridden via PYTHON_PATH env var
const PYTHON_PATH = process.env.PYTHON_PATH || '.venv/bin/python3';

export class ToolManager {
    private toolsDir: string;
    private indexPath: string;
    private tools: Map<string, ToolDefinition>;
    private lastExecutedCommand: string = '';
    private pythonPath: string;

    constructor(serverRoot: string) {
        this.toolsDir = path.join(serverRoot, 'tools');
        this.indexPath = path.join(serverRoot, 'tools.md');
        this.pythonPath = path.join(serverRoot, PYTHON_PATH);
        this.tools = new Map();
        this.loadTools();
        console.log(`[ToolManager] Using Python: ${this.pythonPath}`);
    }

    getLastCommand(): string {
        return this.lastExecutedCommand;
    }

    private loadTools() {
        if (!fs.existsSync(this.indexPath)) {
            return;
        }

        const content = fs.readFileSync(this.indexPath, 'utf-8');
        const sections = content.split(/^## /m).slice(1);

        for (const section of sections) {
            const lines = section.trim().split('\n');
            const name = lines[0].trim();
            const tool: Partial<ToolDefinition> = { name };

            for (const line of lines.slice(1)) {
                const match = line.match(/- \*\*(.*?)\*\*: (.*)/);
                if (match) {
                    const key = match[1].toLowerCase();
                    const value = match[2].trim();
                    if (key === 'description') tool.description = value;
                    if (key === 'api endpoint') tool.apiEndpoint = value;
                    if (key === 'command') tool.command = value.replace(/`/g, '');
                    if (key === 'response type') tool.responseType = value.toLowerCase() as any;
                    if (key === 'response sample') tool.responseSample = value.replace(/`/g, '');
                    // We don't save pip_packages in tools.md as they are installed on creation
                }
            }

            if (tool.name && tool.command) {
                this.tools.set(tool.name, tool as ToolDefinition);
            }
        }
    }

    getTool(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    getAllTools(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    async installPackages(packages: string[]) {
        if (!packages || packages.length === 0) return;

        console.log(`[ToolManager] Installing dependencies: ${packages.join(', ')}`);
        const command = `${this.pythonPath} -m pip install ${packages.join(' ')}`;

        try {
            const { stdout, stderr } = await execAsync(command, { cwd: path.dirname(this.toolsDir) });
            // pip writes to stderr/stdout mixed, usually stderr for progress
            if (stderr) console.log('[ToolManager] pip output:', stderr);
        } catch (error) {
            console.error('[ToolManager] Package installation failed:', error);
            // We log but don't crash, trying to proceed
        }
    }

    private updateToolInMarkdown(entry: string, toolName: string) {
        if (!fs.existsSync(this.indexPath)) {
            fs.writeFileSync(this.indexPath, '# Tool Index\n\n' + entry.trim() + '\n');
            return;
        }

        let content = fs.readFileSync(this.indexPath, 'utf-8');

        // Split content into sections by "## " headers
        const sections = content.split(/(?=^## )/m);

        // Filter out any sections that match this tool name (remove all duplicates)
        const filteredSections = sections.filter(section => {
            const headerMatch = section.match(/^## (.+?)[\r\n]/);
            if (headerMatch) {
                return headerMatch[1].trim() !== toolName;
            }
            return true; // Keep non-tool sections (like the header)
        });

        // Add the new entry
        filteredSections.push(entry.trim() + '\n');

        // Rebuild the file
        const newContent = filteredSections.join('\n').replace(/\n{3,}/g, '\n\n');
        fs.writeFileSync(this.indexPath, newContent);
    }

    async registerTool(tool: ToolDefinition) {
        // Save the script file
        const ext = tool.language === 'python' ? '.py' : '.sh';
        const filename = `${tool.name}${ext}`;
        const filePath = path.join(this.toolsDir, filename);

        fs.writeFileSync(filePath, tool.code || '');
        if (tool.language === 'shell') {
            fs.chmodSync(filePath, '755');
        }

        // Install dependencies if specified
        if (tool.pip_packages && tool.pip_packages.length > 0) {
            await this.installPackages(tool.pip_packages);
        }

        // Update the command to point to the file if it's a generic placeholder
        // Auto-correct command path if it's missing 'tools/' prefix
        if (tool.language === 'python' && tool.command.includes(filename) && !tool.command.includes(`tools/${filename}`)) {
            console.log(`[ToolManager] Fixing command path for ${tool.name}`);
            tool.command = tool.command.replace(filename, `tools/${filename}`);
        }

        // Update tools.md
        const entry = `
## ${tool.name}
- **Description**: ${tool.description}
- **API Endpoint**: ${tool.apiEndpoint}
- **Command**: \`${tool.command}\`
- **Response Type**: ${tool.responseType}
- **Response Sample**: \`${tool.responseSample || ''}\`
- **Usage**: \`${tool.usage || `fetch('${tool.apiEndpoint}').then(r => r.json())`}\`
- **Created**: ${new Date().toISOString()}
`;
        this.updateToolInMarkdown(entry, tool.name);

        // Update in-memory map
        this.tools.set(tool.name, tool);
    }

    async executeTool(name: string, args: Record<string, string>): Promise<string> {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }

        let command = tool.command;

        // Replace python3 with venv python path
        command = command.replace(/^python3\s/, `${this.pythonPath} `);

        // Extract all placeholder names from the command template
        const placeholderMatches = command.match(/\{([a-zA-Z_]+)\}/g) || [];
        const placeholders = placeholderMatches.map(p => p.slice(1, -1));

        const normalizedArgs: Record<string, string> = { ...args };

        // If there's exactly one placeholder and one arg, map them directly
        if (placeholders.length === 1 && Object.keys(args).length === 1) {
            const placeholder = placeholders[0];
            const argKey = Object.keys(args)[0];
            if (!(placeholder in normalizedArgs) && argKey !== placeholder) {
                normalizedArgs[placeholder] = args[argKey];
                console.log(`[ToolManager] Single-arg inference: '${argKey}' -> '${placeholder}'`);
            }
        }

        // Replace placeholders {arg} with actual values, properly quoted for shell
        console.log(`[ToolManager] Executing ${name} with args:`, normalizedArgs);
        for (const [key, value] of Object.entries(normalizedArgs)) {
            // Handle potentially non-string values (e.g. error objects from previous content)
            let strValue = value;
            if (typeof value !== 'string') {
                if (value === undefined || value === null) {
                    strValue = '';
                } else {
                    try {
                        strValue = JSON.stringify(value);
                    } catch {
                        strValue = String(value);
                    }
                }
            }

            // Handle empty values - use '.' for path, or quote empty string
            let finalValue = strValue;
            if (strValue === '') {
                finalValue = key === 'path' ? '.' : "''";  // Default path to current dir
            } else {
                // Quote values that contain spaces or special shell characters
                const needsQuoting = /[\s"'`$\\|&;<>(){}\[\]*?!#~]/.test(strValue);
                finalValue = needsQuoting ? `'${strValue.replace(/'/g, "'\\''")}'` : strValue;
            }
            // Replace ALL occurrences of this placeholder
            command = command.replaceAll(`{${key}}`, finalValue);
        }
        console.log(`[ToolManager] Command: ${command}`);
        this.lastExecutedCommand = command;  // Track for repair agent

        // Ensure command runs from server root so paths like 'tools/script.py' work
        try {
            const { stdout, stderr } = await execAsync(command, { cwd: path.dirname(this.toolsDir) });

            if (stdout) {
                // Limit logging if too large? For now log all as requested.
                console.log(`[ToolManager] ${name} stdout:\n${stdout.trim()}`);
            }
            if (stderr) {
                console.warn(`[ToolManager] ${name} stderr:\n${stderr.trim()}`);
            }
            return stdout.trim();
        } catch (error: any) {
            // exec error object often contains stdout/stderr
            if (error.stdout) console.log(`[ToolManager] ${name} failed stdout:\n${error.stdout.toString().trim()}`);
            if (error.stderr) console.error(`[ToolManager] ${name} failed stderr:\n${error.stderr.toString().trim()}`);

            throw new Error(`Tool execution failed: ${error.message}`);
        }
    }
}
