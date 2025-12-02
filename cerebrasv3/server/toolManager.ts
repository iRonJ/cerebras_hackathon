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
    code?: string; // Content of the script
    language?: 'python' | 'shell';
}

export class ToolManager {
    private toolsDir: string;
    private indexPath: string;
    private tools: Map<string, ToolDefinition>;

    constructor(serverRoot: string) {
        this.toolsDir = path.join(serverRoot, 'tools');
        this.indexPath = path.join(serverRoot, 'tools.md');
        this.tools = new Map();
        this.loadTools();
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

    async registerTool(tool: ToolDefinition) {
        // Save the script file
        const ext = tool.language === 'python' ? '.py' : '.sh';
        const filename = `${tool.name}${ext}`;
        const filePath = path.join(this.toolsDir, filename);

        fs.writeFileSync(filePath, tool.code || '');
        if (tool.language === 'shell') {
            fs.chmodSync(filePath, '755');
        }

        // Update the command to point to the file if it's a generic placeholder
        // But usually the AI should provide the correct command line.
        // Let's assume the AI provides a command like `python3 tools/get_files.py ...`
        // We might need to adjust paths.

        // Append to tools.md
        const entry = `
## ${tool.name}
- **Description**: ${tool.description}
- **API Endpoint**: ${tool.apiEndpoint}
- **Command**: \`${tool.command}\`
- **Response Type**: ${tool.responseType}
- **Created**: ${new Date().toISOString()}
`;
        fs.appendFileSync(this.indexPath, entry);

        // Update in-memory map
        this.tools.set(tool.name, tool);
    }

    async executeTool(name: string, args: Record<string, string>): Promise<string> {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Tool ${name} not found`);
        }

        let command = tool.command;
        // Replace placeholders {arg} with actual values
        console.log(`[ToolManager] Executing ${name} with args:`, args);
        for (const [key, value] of Object.entries(args)) {
            command = command.replace(`{${key}}`, value);
        }
        console.log(`[ToolManager] Command: ${command}`);

        // Ensure command runs from server root so paths like 'tools/script.py' work
        try {
            const { stdout, stderr } = await execAsync(command, { cwd: path.dirname(this.toolsDir) });
            if (stderr) {
                console.warn(`Tool ${name} stderr:`, stderr);
            }
            return stdout.trim();
        } catch (error) {
            throw new Error(`Tool execution failed: ${(error as Error).message}`);
        }
    }
}
