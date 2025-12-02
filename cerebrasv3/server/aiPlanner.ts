import { DesktopModelProvider } from './providers/shared';
import { ToolManager, ToolDefinition } from './toolManager';

export class AIPlanner {
    constructor(
        private provider: DesktopModelProvider,
        private toolManager: ToolManager
    ) { }

    async planRequest(
        method: string,
        path: string,
        query: Record<string, any>,
        body: any
    ): Promise<{
        action: 'direct_response' | 'execute_tool' | 'create_tool',
        toolName?: string,
        toolArgs?: Record<string, string>,
        newToolDefinition?: ToolDefinition,
        response?: any
    }> {

        const tools = this.toolManager.getAllTools();
        const toolsList = tools.map(t => `- ${t.name}: ${t.description} (Endpoint: ${t.apiEndpoint})`).join('\n');

        const prompt = `
You are an intelligent API dispatcher.
User Request: ${method} ${path}
Query: ${JSON.stringify(query)}
Body: ${JSON.stringify(body)}

Available Tools:
${toolsList}

Determine if this request can be handled by an existing tool, or if a NEW tool needs to be created, or if you can answer directly.

If a tool matches the request path (e.g. /get_files matches /get_files), use it.
If the request implies a local system operation (file system, shell, etc.) and no tool exists, you must CREATE a new tool.

IMPORTANT: When using "execute_tool", "toolArgs" keys MUST match the placeholders in the tool's command string (e.g. if command is "... --path {path}", arg key must be "path").

Respond with JSON:
{
  "action": "execute_tool" | "create_tool" | "direct_response",
  "toolName": "name_of_tool",
  "toolArgs": { "arg_name": "value" }, // For execute_tool
  "newToolDefinition": { // For create_tool
    "name": "tool_name",
    "description": "what it does",
    "apiEndpoint": "/api_path",
    "command": "python3 tools/script.py --arg {value}",
    "responseType": "string" | "list" | "json",
    "language": "python",
    "code": "full python code here"
  },
  "response": "direct answer" // For direct_response
}
`;

        // We need a way to call the LLM generically. 
        // The current provider interface `generateWidget` is specific to widgets.
        // I'll assume we can cast or extend the provider to support generic chat, 
        // or just abuse `generateWidget` and ignore the schema for now, 
        // OR better, instantiate a raw client here if needed.
        // For now, let's try to use the provider's underlying client or add a method to the provider interface.
        // Since I can't easily change the provider interface across all files right now without breaking things,
        // I will use a hack: I'll use `generateWidget` but ask it to ignore the widget schema in the prompt?
        // No, `generateWidget` enforces JSON schema.
        // I should probably add a `chat` method to `DesktopModelProvider`.

        // For this implementation, I'll assume I can add `chat` to the provider.
        // But to avoid modifying too many files, I'll use a separate instance of the SDK here if possible,
        // or just cast the provider if I know it's CerebrasProvider.

        // Let's assume I can add `chat` to `DesktopModelProvider` in `shared.ts`.
        // I will do that in a separate step. For now, I'll write this code assuming `provider.chat` exists.

        // Wait, `generateWidget` returns `WidgetLLMResponse`.
        // I really should extend the provider interface.

        const responseText = await this.provider.chat(prompt, "Analyze this request");

        let match: RegExpMatchArray | null = null; // Declare match outside the try block
        try {
            // Extract JSON from response
            match = responseText.match(/([\[{].*[\]}])/s);
            if (!match) {
                console.error("AI Planner response not JSON:", responseText);
                return { action: 'direct_response', response: "AI Planner failed to generate valid JSON plan." };
            }
            const plan = JSON.parse(match[1]);
            return plan;
        } catch (e) {
            console.error("AI Planner JSON parse error:", e);
            return { action: 'direct_response', response: "AI Planner failed to parse plan." };
        }
    }

    async generateTool(toolDescription: string): Promise<ToolDefinition> {
        const prompt = `
Generate a tool (script) based on this description:
${toolDescription}

The tool must be a standalone script (Python or Shell).
It should accept arguments via command line flags (e.g. --arg value).
It should print the result to stdout.

Respond with JSON:
{
  "name": "tool_name",
  "description": "what it does",
  "apiEndpoint": "/api_path",
  "command": "python3 tools/script.py --arg {value}",
  "responseType": "string" | "list" | "json",
  "language": "python" | "shell",
  "code": "full code here"
}
`;
        const responseText = await this.provider.chat(prompt, "Generate tool");
        const match = responseText.match(/([\[{].*[\]}])/s);
        if (!match) throw new Error("Failed to generate tool JSON");
        return JSON.parse(match[1]);
    }

    async identifyTools(userPrompt: string): Promise<ToolDefinition[]> {
        const allTools = this.toolManager.getAllTools();
        const toolsList = allTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

        const prompt = `
User Request: "${userPrompt}"

Available Tools:
${toolsList}

Analyze the request and decide:
1. Which existing tools are relevant?
2. Is a NEW tool needed? If so, describe it.

Respond with JSON:
{
  "relevantToolNames": ["tool1", "tool2"],
  "newToolDescription": "description of new tool if needed, or null"
}
`;

        const responseText = await this.provider.chat(prompt, "Identify tools");
        let match: RegExpMatchArray | null = null;
        try {
            match = responseText.match(/([\[{].*[\]}])/s);
            if (!match) {
                console.error("AI Planner response not JSON:", responseText);
                return [];
            }
            const plan = JSON.parse(match[1]);

            const relevantTools = allTools.filter(t => plan.relevantToolNames?.includes(t.name));

            if (plan.newToolDescription) {
                console.log(`[AIPlanner] Generating new tool: ${plan.newToolDescription}`);
                try {
                    const newTool = await this.generateTool(plan.newToolDescription);
                    await this.toolManager.registerTool(newTool);
                    relevantTools.push(newTool);
                } catch (e) {
                    console.error("Failed to generate new tool:", e);
                }
            }

            return relevantTools;
        } catch (e) {
            console.error("AI Planner JSON parse error:", e);
            return [];
        }
    }
}
