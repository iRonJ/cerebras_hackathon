import { DesktopModelProvider } from './providers/shared';
import { ToolManager, ToolDefinition } from './toolManager';
import type { CachedAppMeta } from './appCache';

export interface IntentResult {
    intent: 'new_app' | 'update_app' | 'tool_only' | 'diagnose_error';
    targetAppId?: string;
    requiredTools: string[];
    newToolDescription?: string;
}

export interface AppGenerationResult {
    html: string;
    js?: string;
    css?: string;
    isLiveUpdating?: boolean;
}

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
You are an intelligent API dispatcher for the Cerebral DE system.

ROUTING RULES:
1. If the request path matches a known tool endpoint exactly, use "execute_tool"
2. If the request implies creating a new HTML/JS application, use "create_app" 
3. If the request references an existing app by ID or context, use "update_app"
4. Only create new tools for system resources (file system, shell, network)
5. Do NOT generate tools that only output HTML or JS/TS/JAX etc.

User Request: ${method} ${path}
Query: ${JSON.stringify(query)}
Body: ${JSON.stringify(body)}

Available Tools:
${toolsList}

Determine if this request can be handled by an existing tool, or if a NEW tool needs to be created, or if you can answer directly.

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

        const responseText = await this.provider.chat(prompt, "Analyze this request");

        let match: RegExpMatchArray | null = null;
        try {
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
  "apiEndpoint": "/api/mono/tool_name",
  "command": "python3 tools/script.py --arg {value}",
  "responseType": "string" | "list" | "json",
  "responseSample": "minimal example of the output (especially for json)",
  "language": "python" | "shell",
  "code": "full code here"
}
`;
        const responseText = await this.provider.chat(prompt, "Generate tool");
        const match = responseText.match(/[\[{].*[\]}]/s);
        if (!match) {
            console.error("[AIPlanner] generateTool failed - no JSON found in response:", responseText.slice(0, 500));
            throw new Error("Failed to generate tool JSON - LLM response did not contain valid JSON");
        }
        try {
            return JSON.parse(match[0]);  // Use match[0], not match[1] - no capture group
        } catch (e) {
            console.error("[AIPlanner] generateTool JSON parse error:", e, "Response:", match[0].slice(0, 500));
            throw new Error(`Failed to parse tool JSON: ${(e as Error).message}`);
        }
    }

    /**
     * Repair a broken tool - mini-agent that analyzes errors and fixes tool code
     * ONLY called when tool execution fails
     */
    async repairTool(
        tool: ToolDefinition,
        errorMessage: string,
        executedCommand: string,
        args: Record<string, string>
    ): Promise<{ fixed: boolean; updatedTool?: ToolDefinition; updatedCode?: string }> {
        console.log(`[AIPlanner] Tool repair agent triggered for: ${tool.name}`);
        console.log(`[AIPlanner] Error: ${errorMessage}`);

        // Read the current tool code
        const toolPath = `tools/${tool.name}.py`;
        let currentCode = '';
        try {
            const fs = await import('fs');
            const path = await import('path');
            const fullPath = path.join(process.cwd(), 'server', toolPath);
            if (fs.existsSync(fullPath)) {
                currentCode = fs.readFileSync(fullPath, 'utf-8');
            }
        } catch (e) {
            console.warn(`[AIPlanner] Could not read tool code: ${e}`);
        }

        const repairPrompt = `
You are a TOOL REPAIR AGENT. A tool execution has FAILED and you need to diagnose and fix it.

BROKEN TOOL: ${tool.name}
DESCRIPTION: ${tool.description}
COMMAND TEMPLATE: ${tool.command}
EXECUTED COMMAND: ${executedCommand}
ARGUMENTS PASSED: ${JSON.stringify(args)}

ERROR MESSAGE:
${errorMessage}

CURRENT TOOL CODE:
\`\`\`python
${currentCode || 'Code not available'}
\`\`\`

DIAGNOSE THE PROBLEM:
- Is it a command-line argument parsing issue?
- Is it a path/quoting issue (spaces in paths)?
- Is it a permission error?
- Is it a logic error in the code?
- Is it a missing dependency?

FIX THE TOOL by providing updated code that handles this case correctly.

Respond with JSON:
{
  "diagnosis": "brief explanation of what went wrong",
  "fixType": "code" | "command" | "both" | "unfixable",
  "updatedCode": "complete fixed Python code (if fixType is code or both)",
  "updatedCommand": "fixed command template (if fixType is command or both)",
  "testSuggestion": "how to verify the fix works"
}
`;

        try {
            const responseText = await this.provider.chat(repairPrompt, "Repair tool");
            const match = responseText.match(/[\[{].*[\]}]/s);
            if (!match) {
                console.error("[AIPlanner] Repair agent failed to generate JSON");
                return { fixed: false };
            }

            const repair = JSON.parse(match[1]);
            console.log(`[AIPlanner] Repair diagnosis: ${repair.diagnosis}`);
            console.log(`[AIPlanner] Fix type: ${repair.fixType}`);

            if (repair.fixType === 'unfixable') {
                console.warn(`[AIPlanner] Tool ${tool.name} is unfixable: ${repair.diagnosis}`);
                return { fixed: false };
            }

            // Apply the fix
            if (repair.updatedCode && (repair.fixType === 'code' || repair.fixType === 'both')) {
                const fs = await import('fs');
                const path = await import('path');
                const fullPath = path.join(process.cwd(), 'server', toolPath);
                fs.writeFileSync(fullPath, repair.updatedCode);
                console.log(`[AIPlanner] Updated tool code: ${fullPath}`);
            }

            // Update the command template if needed
            const updatedTool: ToolDefinition = { ...tool };
            if (repair.updatedCommand && (repair.fixType === 'command' || repair.fixType === 'both')) {
                updatedTool.command = repair.updatedCommand;
                // Re-register the tool with updated command
                await this.toolManager.registerTool(updatedTool);
                console.log(`[AIPlanner] Updated tool command template`);
            }

            return {
                fixed: true,
                updatedTool,
                updatedCode: repair.updatedCode,
            };
        } catch (e) {
            console.error(`[AIPlanner] Repair agent error:`, e);
            return { fixed: false };
        }
    }

    /**
     * Diagnose an error reported from the UI and determine if it's a tool or app issue
     * Called when user reports "I'm seeing an error" on a window
     */
    async diagnoseAppError(
        userMessage: string,
        appHtml: string,
        toolsUsed: string[],
        errorContext?: string
    ): Promise<{
        diagnosis: string;
        issueType: 'app_code' | 'tool_code' | 'both' | 'unknown';
        toolsToFix: string[];
        appCodeFix?: string;
        toolFixes: Array<{ toolName: string; fixApplied: boolean; diagnosis: string }>;
    }> {
        console.log(`[AIPlanner] Diagnosing app error with ${toolsUsed.length} tools used`);

        // Read the code for all tools used
        const toolsWithCode: Array<{ tool: ToolDefinition; code: string }> = [];
        for (const toolName of toolsUsed) {
            const tool = this.toolManager.getTool(toolName);
            if (tool) {
                let code = '';
                try {
                    const fs = await import('fs');
                    const path = await import('path');
                    const toolPath = path.join(process.cwd(), 'server', 'tools', `${toolName}.py`);
                    if (fs.existsSync(toolPath)) {
                        code = fs.readFileSync(toolPath, 'utf-8');
                    }
                } catch (e) {
                    console.warn(`[AIPlanner] Could not read tool code for ${toolName}`);
                }
                toolsWithCode.push({ tool, code });
            }
        }

        const toolsInfo = toolsWithCode.map(({ tool, code }) => `
TOOL: ${tool.name}
Description: ${tool.description}
API Endpoint: ${tool.apiEndpoint}
Response Type: ${tool.responseType}
Response Sample: ${tool.responseSample || 'N/A'}
Code:
\`\`\`python
${code.slice(0, 2000) || 'Code not available'}
\`\`\`
`).join('\n---\n');

        const diagnosePrompt = `
You are a DIAGNOSTIC AGENT for the Cerebral DE system. A user has reported an error in their generated app.

USER'S ERROR REPORT:
${userMessage}

${errorContext ? `ADDITIONAL ERROR CONTEXT:\n${errorContext}\n` : ''}

GENERATED APP CODE (HTML/JS):
\`\`\`html
${appHtml.slice(0, 4000)}
\`\`\`

TOOLS USED BY THIS APP:
${toolsInfo}

ANALYZE THE ERROR:
1. Is the error in the APP CODE (HTML/JS) - wrong parsing, incorrect API usage, missing error handling?
2. Is the error in the TOOL CODE (Python) - wrong response format, missing fields, incorrect logic?
3. Is it BOTH - app and tool have issues?

DIAGNOSE AND RECOMMEND FIXES:

Respond with JSON:
{
  "diagnosis": "detailed explanation of what's wrong",
  "issueType": "app_code" | "tool_code" | "both" | "unknown",
  "toolsToFix": ["tool_name1", "tool_name2"],
  "appCodeIssues": "description of app code issues if any",
  "toolCodeIssues": {
    "tool_name": "description of what's wrong and how to fix it"
  },
  "suggestedToolFixes": {
    "tool_name": "complete corrected Python code (if tool needs fixing)"
  }
}
`;

        try {
            const responseText = await this.provider.chat(diagnosePrompt, "Diagnose error");
            const match = responseText.match(/[\[{].*[\]}]/s);
            if (!match) {
                console.error("[AIPlanner] Diagnosis failed - no JSON");
                return { diagnosis: "Could not diagnose error", issueType: 'unknown', toolsToFix: [], toolFixes: [] };
            }

            const result = JSON.parse(match[0]);
            console.log(`[AIPlanner] Diagnosis: ${result.diagnosis}`);
            console.log(`[AIPlanner] Issue type: ${result.issueType}`);

            // Apply tool fixes if recommended
            const toolFixes: Array<{ toolName: string; fixApplied: boolean; diagnosis: string }> = [];

            if (result.issueType === 'tool_code' || result.issueType === 'both') {
                const suggestedFixes = result.suggestedToolFixes || {};

                for (const [toolName, fixCode] of Object.entries(suggestedFixes)) {
                    if (typeof fixCode === 'string' && fixCode.trim()) {
                        try {
                            const fs = await import('fs');
                            const path = await import('path');
                            const toolPath = path.join(process.cwd(), 'server', 'tools', `${toolName}.py`);
                            fs.writeFileSync(toolPath, fixCode);
                            console.log(`[AIPlanner] Applied fix to tool: ${toolName}`);
                            toolFixes.push({
                                toolName,
                                fixApplied: true,
                                diagnosis: result.toolCodeIssues?.[toolName] || 'Fixed'
                            });
                        } catch (e) {
                            console.error(`[AIPlanner] Failed to apply fix to ${toolName}:`, e);
                            toolFixes.push({
                                toolName,
                                fixApplied: false,
                                diagnosis: result.toolCodeIssues?.[toolName] || 'Fix available but could not apply'
                            });
                        }
                    }
                }
            }

            return {
                diagnosis: result.diagnosis,
                issueType: result.issueType,
                toolsToFix: result.toolsToFix || [],
                appCodeFix: result.appCodeIssues,
                toolFixes,
            };
        } catch (e) {
            console.error(`[AIPlanner] Diagnosis error:`, e);
            return { diagnosis: `Diagnosis failed: ${(e as Error).message}`, issueType: 'unknown', toolsToFix: [], toolFixes: [] };
        }
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
2. Is a NEW tool needed to access shell commands or system resources? If so, describe it. New tools are only needed if it's a system resource that cannot be accessed from a browser based html/js application. DO NOT generate tools that only output HTML or JS/TS/JAX etc.

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

    /**
     * Classify the intent of a request for the state machine
     */
    async classifyIntent(prompt: string, cachedApps: CachedAppMeta[]): Promise<IntentResult> {
        const allTools = this.toolManager.getAllTools();
        const toolsList = allTools.map(t => `- ${t.name}: ${t.description}`).join('\n');

        const appsList = cachedApps.length > 0
            ? cachedApps.map(a => `- ID: "${a.id}" | Prompt: "${a.prompt}"`).join('\n')
            : 'No existing apps in session';

        const classifyPrompt = `
You are an intelligent request classifier for the Cerebral DE system.

ANALYZE THIS REQUEST:
${prompt}

EXISTING APPS IN SESSION:
${appsList}

AVAILABLE TOOLS (REUSE THESE FIRST - do NOT create new tools if existing tools can fulfill the request):
${toolsList}

CRITICAL RULES:
1. **ALWAYS REUSE existing tools** - ONLY request a new tool if no existing tool can accomplish the task
2. Use EXACT tool names from the list above (e.g., "get_files_tool" not "get_files")
3. When generating apps, the AI should call tools via their API endpoints listed in tools.md

CLASSIFICATION RULES:
1. "new_app" - User wants to CREATE a new HTML/JS widget/application
2. "update_app" - User wants to MODIFY an existing app (references app by ID, title, or description)
3. "tool_only" - User just wants data/tool execution, NO app generation
4. "diagnose_error" - User is REPORTING AN ERROR, BUG, or PROBLEM with an existing app (keywords: error, bug, broken, not working, issue, problem, fix, doesn't work)

If "update_app", identify which existing app ID they're referring to.
If "diagnose_error", the system will analyze tool code to determine if the issue is in app or tool code.
List ALL tools from the available list that would be needed for this request.
ONLY set newToolDescription if absolutely necessary (no existing tool can do it).

Respond with JSON:
{
  "intent": "new_app" | "update_app" | "tool_only" | "diagnose_error",
  "targetAppId": "app_id if updating or diagnosing, otherwise null",
  "requiredTools": ["tool_name1", "tool_name2"],
  "newToolDescription": "description if new tool needed (rare!), otherwise null",
  "reasoning": "brief explanation of classification and which existing tools fulfill the request"
}
`;

        const responseText = await this.provider.chat(classifyPrompt, "Classify intent");

        try {
            const match = responseText.match(/([\[{].*[\]}])/s);
            if (!match) {
                console.error("[AIPlanner] classifyIntent response not JSON:", responseText);
                return { intent: 'tool_only', requiredTools: [] };
            }

            const result = JSON.parse(match[1]);
            console.log(`[AIPlanner] Classified intent: ${result.intent}`, result.reasoning);

            return {
                intent: result.intent || 'tool_only',
                targetAppId: result.targetAppId || undefined,
                requiredTools: result.requiredTools || [],
                newToolDescription: result.newToolDescription || undefined,
            };
        } catch (e) {
            console.error("[AIPlanner] classifyIntent parse error:", e);
            return { intent: 'tool_only', requiredTools: [] };
        }
    }

    /**
     * Generate an app/widget based on requirements
     */
    async generateApp(
        prompt: string,
        context: {
            appId: string;
            apiRoot: string;
            tools: Array<{ name: string; description: string; endpoint: string; responseSample?: string }>;
            existingContent?: string;
        }
    ): Promise<AppGenerationResult> {
        const toolsInfo = context.tools.map(t =>
            `- ${t.name}: ${t.description}
  Endpoint: ${t.endpoint}
  Sample Response: ${t.responseSample || 'N/A'}`
        ).join('\n');

        const updateContext = context.existingContent
            ? `
EXISTING APP CONTENT (you are UPDATING this app):
\`\`\`html
${context.existingContent.slice(0, 3000)}
\`\`\`

IMPORTANT: Preserve existing functionality unless explicitly asked to change it.
Update the code based on the user's new request.
`
            : '';

        const generatePrompt = `
You are the Cerebral DE App Builder. Generate a complete, responsive HTML/JS widget.

USER REQUEST:
${prompt}

APP ID: ${context.appId}
API ROOT: ${context.apiRoot}

AVAILABLE TOOLS (use fetch() to call these):
${toolsInfo}
${updateContext}

CRITICAL INSTRUCTIONS FOR TOOL USAGE:
1. Study the "Sample Response" for each tool - this shows the EXACT JSON structure you'll receive
2. For GET requests with parameters, use query strings: fetch('${context.apiRoot}/get_files?path=/some/path')
3. For POST requests with data: fetch('${context.apiRoot}/tool_name', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({...}) })
4. ALWAYS parse the response as JSON: const data = await response.json(); then access data.result or the nested structure
5. Handle errors gracefully with try/catch and show user-friendly messages

DESIGN REQUIREMENTS:
1. Create a fully responsive HTML widget with modern, premium styling
2. Include all CSS inline or in a <style> tag
3. Include all JS inline or in a <script> tag  
4. The widget must be self-contained and work in an iframe
5. Use vibrant colors, smooth animations, and modern typography
6. Set isLiveUpdating=true if the app needs periodic data refresh from resources not available from a web browser

Respond with JSON:
{
  "html": "complete HTML including styles and scripts",
  "js": "optional separate JS if needed",
  "css": "optional separate CSS if needed", 
  "isLiveUpdating": true/false,
  "explanation": "brief explanation of what was built"
}
`;

        const responseText = await this.provider.chat(generatePrompt, "Generate app");

        try {
            const match = responseText.match(/([\[{].*[\]}])/s);
            if (!match) {
                console.error("[AIPlanner] generateApp response not JSON:", responseText);
                throw new Error("Failed to generate app: Invalid JSON response");
            }

            const result = JSON.parse(match[1]);
            console.log(`[AIPlanner] Generated app: ${result.explanation || 'no explanation'}`);

            return {
                html: result.html || result.HTMLText || '',
                js: result.js,
                css: result.css,
                isLiveUpdating: Boolean(result.isLiveUpdating || result.liveData),
            };
        } catch (e) {
            console.error("[AIPlanner] generateApp parse error:", e);
            throw new Error(`Failed to generate app: ${(e as Error).message}`);
        }
    }
}

