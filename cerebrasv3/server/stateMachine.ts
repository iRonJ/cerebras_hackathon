/**
 * RequestStateMachine - Agentic state machine for request handling
 * 
 * Implements the Cerebral DE graph design with 15 state nodes.
 * Maintains mono API design with improved state transitions.
 */

import type { ToolDefinition } from './toolManager';
import type { ToolManager } from './toolManager';
import type { AIPlanner } from './aiPlanner';
import type { AppCache, CachedAppFull, CachedAppMeta } from './appCache';
import type { RegexLadder } from './regexLadder';

// State enum matching graph node IDs
export enum State {
    USER_REQUEST = 'USER_REQUEST',
    MONO_PARSE = 'MONO_PARSE',
    REGEX_MATCHED = 'REGEX_MATCHED',
    AI_PREPROCESS = 'AI_PREPROCESS',
    INTENT_NEW_APP = 'INTENT_NEW_APP',
    INTENT_UPDATE_APP = 'INTENT_UPDATE_APP',
    DIAGNOSE_ERROR = 'DIAGNOSE_ERROR',
    TOOL_AGENT = 'TOOL_AGENT',
    VIRTUAL_RESPONSE = 'VIRTUAL_RESPONSE',

    // Validated 2-Loop Architecture States
    TOOL_PREPARATION = 'TOOL_PREPARATION', // Loop 1: Tool Prep
    APP_GENERATION = 'APP_GENERATION',     // Loop 2a: Generate
    APP_REVIEW = 'APP_REVIEW',             // Loop 2b: Review
    APP_VERIFICATION = 'APP_VERIFICATION', // Loop 2c: Verify
    APP_RETURNED = 'APP_RETURNED',

    // Legacy states to eventually remove/migrate
    APP_BUILDER = 'APP_BUILDER',
    TOOLS_DEFINED = 'TOOLS_DEFINED',

    LIVE_UPDATING_LOOP = 'LIVE_UPDATING_LOOP',
    FRONTEND_POLLING = 'FRONTEND_POLLING',
    SERVER_APP_SYNC = 'SERVER_APP_SYNC',
    POLLING_RESPONSE = 'POLLING_RESPONSE',
    BACKGROUND_UPDATE = 'BACKGROUND_UPDATE',
    END = 'END',
    ERROR = 'ERROR',
}

export interface RequestData {
    method: string;
    path: string;
    query: Record<string, any>;
    body: any;
    sessionId?: string;
}

export interface StateMachineContext {
    sessionId: string;
    request: RequestData;
    currentState: State;
    stateHistory: State[];

    // Regex match results
    matchedTool?: ToolDefinition;
    matchedArgs?: Record<string, string>;

    // Intent results
    intent?: 'new_app' | 'update_app' | 'tool_only' | 'diagnose_error' | 'virtual_response';
    targetAppId?: string;

    // Cached app data
    cachedApp?: CachedAppFull;
    cachedAppMeta?: CachedAppMeta;

    // Tool resolution
    requiredTools: ToolDefinition[];
    newToolsGenerated: ToolDefinition[];

    // App generation
    generatedApp?: CachedAppFull;
    isLiveUpdating: boolean;

    // Review/Verify Context
    reviewFeedback?: string[];
    verificationIssues?: string[];
    appGenerationAttempts: number;

    // Diagnosis Context
    diagnosisContext?: string;
    appCodeFix?: string;

    // Response
    response?: any;
    error?: Error;

    // API root pattern for generated apps
    apiRoot: string;
}

export interface StateMachineResult {
    success: boolean;
    state: State;
    response?: any;
    error?: string;
    context?: Partial<StateMachineContext>;
}

export interface PollResult {
    updatedApps: CachedAppFull[];
    removedAppIds: string[];
    activeAppIds: string[];
}

type StateHandler = (ctx: StateMachineContext) => Promise<State>;

export class RequestStateMachine {
    private handlers: Map<State, StateHandler> = new Map();

    constructor(
        private toolManager: ToolManager,
        private aiPlanner: AIPlanner,
        private appCache: AppCache,
        private regexLadder: RegexLadder,
        private apiRoot: string = '/api/mono'
    ) {
        this.registerHandlers();
    }

    private registerHandlers(): void {
        this.handlers.set(State.USER_REQUEST, this.handleUserRequest.bind(this));
        this.handlers.set(State.MONO_PARSE, this.handleMonoParse.bind(this));
        this.handlers.set(State.REGEX_MATCHED, this.handleRegexMatched.bind(this));
        this.handlers.set(State.AI_PREPROCESS, this.handleAIPreprocess.bind(this));
        this.handlers.set(State.INTENT_NEW_APP, this.handleIntentNewApp.bind(this));
        this.handlers.set(State.INTENT_UPDATE_APP, this.handleIntentUpdateApp.bind(this));
        this.handlers.set(State.DIAGNOSE_ERROR, this.handleDiagnoseError.bind(this));
        this.handlers.set(State.TOOL_AGENT, this.handleToolAgent.bind(this));
        this.handlers.set(State.VIRTUAL_RESPONSE, this.handleVirtualResponse.bind(this));

        // 2-Loop Architecture Handlers
        this.handlers.set(State.TOOL_PREPARATION, this.handleToolPreparation.bind(this));
        this.handlers.set(State.APP_GENERATION, this.handleAppGeneration.bind(this));
        this.handlers.set(State.APP_REVIEW, this.handleAppReview.bind(this));
        this.handlers.set(State.APP_VERIFICATION, this.handleAppVerification.bind(this));

        this.handlers.set(State.APP_BUILDER, this.handleAppBuilder.bind(this));
        this.handlers.set(State.APP_RETURNED, this.handleAppReturned.bind(this));
        this.handlers.set(State.LIVE_UPDATING_LOOP, this.handleLiveUpdatingLoop.bind(this));
        this.handlers.set(State.BACKGROUND_UPDATE, this.handleBackgroundUpdate.bind(this));
    }

    /**
     * Process a request through the state machine
     */
    async process(request: RequestData): Promise<StateMachineResult> {
        const ctx: StateMachineContext = {
            sessionId: request.sessionId || `session_${Date.now()}`,
            request,
            currentState: State.USER_REQUEST,
            stateHistory: [],
            requiredTools: [],
            newToolsGenerated: [],
            isLiveUpdating: false,
            appGenerationAttempts: 0,
            apiRoot: this.apiRoot,
        };

        try {
            while (ctx.currentState !== State.END && ctx.currentState !== State.ERROR) {
                const handler = this.handlers.get(ctx.currentState);
                if (!handler) {
                    console.log(`[StateMachine] No handler for state: ${ctx.currentState}, ending`);
                    break;
                }

                ctx.stateHistory.push(ctx.currentState);
                console.log(`[StateMachine] State: ${ctx.currentState}`);

                const nextState = await handler(ctx);
                ctx.currentState = nextState;
            }

            return {
                success: ctx.currentState !== State.ERROR,
                state: ctx.currentState,
                response: ctx.response,
                error: ctx.error?.message,
            };
        } catch (error) {
            console.error('[StateMachine] Unhandled error:', error);
            return {
                success: false,
                state: State.ERROR,
                error: (error as Error).message,
            };
        }
    }

    /**
     * Handle frontend polling request
     */
    async handlePoll(sessionId: string, appIds: string[]): Promise<PollResult> {
        console.log(`[StateMachine] Poll from session ${sessionId} with ${appIds.length} apps`);

        // Sync app list - remove apps not present in frontend
        const removedApps = this.appCache.removeStale(appIds);
        const removedAppIds = removedApps.map(a => a.id);

        // Get live-updating apps that may have new content
        const liveApps = this.appCache.getLiveUpdatingApps();
        const updatedApps: CachedAppFull[] = [];

        for (const app of liveApps) {
            if (appIds.includes(app.id)) {
                // Check if app needs update (simplified: check if lastUpdated is recent)
                const timeSinceUpdate = Date.now() - app.lastUpdated;
                if (timeSinceUpdate < 60000) { // Updated in last minute
                    updatedApps.push(app);
                }
            }
        }

        return {
            updatedApps,
            removedAppIds,
            activeAppIds: this.appCache.getAllIds(),
        };
    }

    // ==================== State Handlers ====================

    private async handleUserRequest(ctx: StateMachineContext): Promise<State> {
        // Entry point - move to parse
        return State.MONO_PARSE;
    }

    private async handleMonoParse(ctx: StateMachineContext): Promise<State> {
        const { method, path, query, body } = ctx.request;

        // Try regex ladder first (fast path)
        const match = this.regexLadder.match(method, path, query, body);

        if (match) {
            // Get the tool definition
            const tool = this.toolManager.getTool(match.toolName);
            if (tool) {
                ctx.matchedTool = tool;
                ctx.matchedArgs = match.args;
                return State.REGEX_MATCHED;
            }
        }

        // No regex match - need AI preprocessing
        return State.AI_PREPROCESS;
    }

    private async executeToolWithRetry(
        tool: ToolDefinition,
        args: Record<string, string>,
        maxRetries: number = 3
    ): Promise<string> {
        let currentTool = tool;
        let attempt = 0;
        let lastError: Error | null = null;
        let lastCommand = '';

        while (attempt <= maxRetries) {
            attempt++;
            try {
                // Execute
                const result = await this.toolManager.executeTool(currentTool.name, args);
                return result;
            } catch (error) {
                lastError = error as Error;
                lastCommand = this.toolManager.getLastCommand() || 'unknown';
                console.warn(`[StateMachine] Tool execution failed (Attempt ${attempt}/${maxRetries + 1}):`, lastError.message);

                if (attempt > maxRetries) {
                    break;
                }

                // Trigger repair
                console.log(`[StateMachine] Triggering repair agent...`);
                const repairResult = await this.aiPlanner.repairTool(
                    currentTool,
                    lastError.message,
                    lastCommand,
                    args
                );

                if (repairResult.fixed && repairResult.updatedTool) {
                    console.log(`[StateMachine] Tool repair succeeded, retrying with updated tool...`);
                    currentTool = repairResult.updatedTool;
                    // Loop continues with new tool
                } else {
                    console.warn(`[StateMachine] Tool repair failed or verified unfixable. Stopping retries.`);
                    break;
                }
            }
        }

        // If we got here, all retries failed
        // Construct a clean JSON error response if possible
        const errorResponse = {
            status: "error",
            error: lastError?.message || "Tool execution failed multiple times",
            command: lastCommand,
            attempts: attempt
        };

        // Throw or return? The caller expects a string result (JSON string or raw).
        // Let's return the error JSON string so the caller can parse it.
        return JSON.stringify(errorResponse);
    }

    private async handleRegexMatched(ctx: StateMachineContext): Promise<State> {
        // Fast path: execute tool directly
        if (!ctx.matchedTool) {
            ctx.error = new Error('No matched tool in context');
            return State.ERROR;
        }

        try {
            const result = await this.executeToolWithRetry(
                ctx.matchedTool,
                ctx.matchedArgs || {}
            );

            // Parse JSON results if the tool returns JSON
            if (ctx.matchedTool.responseType === 'json') {
                try {
                    ctx.response = JSON.parse(result);
                } catch {
                    // check if result is already our error JSON?
                    // if parse failed, wrap string
                    ctx.response = { result };
                }
            } else {
                ctx.response = { result };
            }
            return State.END;
        } catch (error) {
            // Should not happen as executeToolWithRetry catches internally and returns error JSON
            // But just in case
            console.error('[StateMachine] unhandled error in regex match:', error);
            ctx.error = error as Error;
            return State.ERROR;
        }
    }

    private async handleAIPreprocess(ctx: StateMachineContext): Promise<State> {
        const { request, sessionId } = ctx;

        // Get cached app metadata for context (lightweight)
        const cachedApps = this.appCache.getSessionMeta(sessionId);

        // Build prompt for intent classification
        const prompt = this.buildIntentPrompt(request, cachedApps);

        const MAX_TOOL_GENERATION_ITERATIONS = 5; // Safety limit
        let iterations = 0;

        try {
            // Loop until no new tools are needed
            while (iterations < MAX_TOOL_GENERATION_ITERATIONS) {
                iterations++;

                // Get current list of available tools for context
                const availableToolNames = this.toolManager.getAllTools().map(t => t.name);

                const intentResult = await this.aiPlanner.classifyIntent(prompt, cachedApps);

                ctx.intent = intentResult.intent;
                ctx.targetAppId = intentResult.targetAppId;

                // Gather all required tools
                const newRequiredTools = intentResult.requiredTools.map(name =>
                    this.toolManager.getTool(name)
                ).filter((t): t is ToolDefinition => t !== undefined);

                // Add any new tools not already in our list
                for (const tool of newRequiredTools) {
                    if (!ctx.requiredTools.some(t => t.name === tool.name)) {
                        ctx.requiredTools.push(tool);
                    }
                }

                if (intentResult.newToolDescription) {
                    // Generate the new tool
                    console.log(`[StateMachine] Iteration ${iterations}: Generating new tool...`);
                    const newTool = await this.aiPlanner.generateTool(intentResult.newToolDescription);
                    await this.toolManager.registerTool(newTool);

                    // Add a regex pattern for the new tool
                    this.regexLadder.addPattern({
                        pattern: `^${newTool.apiEndpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?.*)?$`,
                        toolName: newTool.name,
                        method: '*',
                        argMapping: {},
                        description: newTool.description,
                    });

                    ctx.requiredTools.push(newTool);
                    ctx.newToolsGenerated.push(newTool);

                    // Continue loop to check if more tools are needed
                    console.log(`[StateMachine] Generated tool: ${newTool.name}, checking if more tools needed...`);
                    continue;
                }

                // No new tool needed, we're done with tool discovery
                console.log(`[StateMachine] Tool discovery complete after ${iterations} iteration(s), found ${ctx.requiredTools.length} tools`);
                break;
            }

            if (iterations >= MAX_TOOL_GENERATION_ITERATIONS) {
                console.warn(`[StateMachine] Hit max tool generation iterations (${MAX_TOOL_GENERATION_ITERATIONS})`);
            }

            // Determine next state based on intent
            switch (ctx.intent) {
                case 'new_app':
                    return State.INTENT_NEW_APP;
                case 'update_app':
                    return State.INTENT_UPDATE_APP;
                case 'diagnose_error':
                    return State.DIAGNOSE_ERROR;
                case 'virtual_response':
                    return State.VIRTUAL_RESPONSE;
                case 'tool_only':
                    return State.TOOL_PREPARATION;
                default:
                    return State.TOOL_PREPARATION;
            }
        } catch (error) {
            ctx.error = error as Error;
            return State.ERROR;
        }
    }

    private async handleVirtualResponse(ctx: StateMachineContext): Promise<State> {
        console.log('[StateMachine] Generating Virtual Response...');
        const userPrompt = ctx.request.body?.prompt || ctx.request.query?.prompt || `Generate content for ${ctx.request.method} ${ctx.request.path} ${JSON.stringify(ctx.request.query)}`;

        const context = {
            apiRoot: ctx.apiRoot,
            tools: ctx.requiredTools.map(t => ({
                name: t.name,
                description: t.description,
                endpoint: t.apiEndpoint,
                responseSample: t.responseSample
            }))
        };

        try {
            const result = await this.aiPlanner.generateVirtualResponse(
                userPrompt,
                context
            );

            console.log(`[StateMachine] Virtual response generated (${result.contentType})`);

            // Set the raw response
            ctx.response = {
                _raw_content: true,
                content: result.content,
                contentType: result.contentType,
                filename: result.filename
            };

            return State.END;
        } catch (error) {
            console.error('[StateMachine] Virtual response generation failed:', error);
            ctx.error = error as Error;
            return State.ERROR;
        }
    }

    private async handleIntentNewApp(ctx: StateMachineContext): Promise<State> {
        // New app flow - tools are identified, move to tool preparation loop
        console.log(`[StateMachine] Creating new app with ${ctx.requiredTools.length} tools`);
        return State.TOOL_PREPARATION;
    }

    private async handleIntentUpdateApp(ctx: StateMachineContext): Promise<State> {
        // Update existing app - retrieve full cached app data
        if (ctx.targetAppId) {
            ctx.cachedApp = this.appCache.getFull(ctx.targetAppId);
            ctx.cachedAppMeta = this.appCache.getMeta(ctx.targetAppId);

            if (ctx.cachedApp) {
                console.log(`[StateMachine] Updating app ${ctx.targetAppId}`);
            } else {
                console.log(`[StateMachine] App ${ctx.targetAppId} not in cache, treating as new`);
            }
        }

        return State.TOOL_PREPARATION;
    }

    private async handleDiagnoseError(ctx: StateMachineContext): Promise<State> {
        console.log(`[StateMachine] Diagnosing error for app ${ctx.targetAppId}`);

        // Get the cached app content for diagnosis
        const appContent = ctx.cachedApp?.html || ctx.request.body?.current_content || '';
        const toolsUsed = ctx.requiredTools.map(t => t.name);
        const userMessage = ctx.request.body?.prompt || 'User reported an error';
        const errorContext = ctx.request.body?.error_message;

        try {
            const diagnosis = await this.aiPlanner.diagnoseAppError(
                userMessage,
                appContent,
                toolsUsed,
                errorContext
            );

            console.log(`[StateMachine] Diagnosis: ${diagnosis.diagnosis}`);
            console.log(`[StateMachine] Issue type: ${diagnosis.issueType}`);

            // Add diagnosis to response
            ctx.response = {
                diagnosis: diagnosis.diagnosis,
                issueType: diagnosis.issueType,
                toolFixes: diagnosis.toolFixes,
                appCodeFix: diagnosis.appCodeFix,
            };

            // Capture diagnosis context for potential re-generation
            if (diagnosis.diagnosis) {
                ctx.diagnosisContext = diagnosis.diagnosis;
                ctx.appCodeFix = diagnosis.appCodeFix;
            }

            // If tools were fixed, tell the frontend
            if (diagnosis.toolFixes.length > 0) {
                ctx.response.toolsRepaired = diagnosis.toolFixes.filter(f => f.fixApplied).map(f => f.toolName);
            }

            // After diagnosis, proceed to app builder to regenerate with fixes
            if (diagnosis.issueType !== 'unknown') {
                return State.APP_GENERATION;
            }

            return State.END;
        } catch (error) {
            console.error(`[StateMachine] Diagnose error failed:`, error);
            ctx.error = error as Error;
            return State.ERROR;
        }
    }

    /**
     * Loop 1: Tool Preparation
     * Iteratively ensures all necessary tools exist and are up to date
     */
    private async handleToolPreparation(ctx: StateMachineContext): Promise<State> {
        console.log('[StateMachine] Entering Tool Preparation Loop');
        const userRequest = ctx.request.body?.prompt || ctx.request.query?.prompt || '';

        try {
            // Check what tools we have vs what we need
            const prepResult = await this.aiPlanner.prepareTools(
                userRequest,
                this.toolManager.getAllTools()
            );

            if (!prepResult.missingTools) {
                console.log('[StateMachine] Tool Preparation Complete - All tools ready.');

                // Update required tools list
                if (prepResult.finalToolList) {
                    ctx.requiredTools = prepResult.finalToolList
                        .map(name => this.toolManager.getTool(name))
                        .filter((t): t is ToolDefinition => !!t);
                }

                // Transition to next phase based on intent
                if (ctx.intent === 'tool_only') {
                    return State.TOOL_AGENT;
                } else {
                    return State.APP_GENERATION;
                }
            }

            // Handle Creations
            if (prepResult.toolsToCreate && prepResult.toolsToCreate.length > 0) {
                for (const desc of prepResult.toolsToCreate) {
                    console.log(`[StateMachine] Creating new tool: ${desc.substring(0, 50)}...`);
                    const newTool = await this.aiPlanner.generateTool(desc);
                    await this.toolManager.registerTool(newTool);

                    // Add regex for new tool
                    this.regexLadder.addPattern({
                        pattern: `^${newTool.apiEndpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?.*)?$`,
                        method: 'POST', // Default to POST for tools
                        toolName: newTool.name,
                        argMapping: {}
                    });
                }
            }

            // Handle Updates
            if (prepResult.toolsToUpdate && prepResult.toolsToUpdate.length > 0) {
                console.log(`[StateMachine] Tools needing update: ${prepResult.toolsToUpdate.join(', ')}`);

                for (const toolName of prepResult.toolsToUpdate) {
                    const existingTool = this.toolManager.getTool(toolName);
                    if (existingTool) {
                        const instructions = prepResult.updateInstructions?.[toolName] || "Update to match requirements";
                        console.log(`[StateMachine] Updating tool ${toolName} with instructions: ${instructions.substring(0, 50)}...`);

                        const success = await this.aiPlanner.updateTool(existingTool, instructions);
                        if (success) {
                            // Re-fetch updated tool definition
                            const updatedTool = this.toolManager.getTool(toolName);
                            if (updatedTool) {
                                // Add regex pattern for the updated tool (idempotent if endpoint same, safe if different)
                                this.regexLadder.addPattern({
                                    pattern: `^${updatedTool.apiEndpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\?.*)?$`,
                                    method: 'POST',
                                    toolName: updatedTool.name,
                                    argMapping: {}
                                });
                            }
                        }
                    } else {
                        console.warn(`[StateMachine] Requested update for missing tool: ${toolName}`);
                    }
                }
            }

            // If we created/updated tools, we loop back to check if we're done
            return State.TOOL_PREPARATION;

        } catch (error) {
            console.error('[StateMachine] Tool Preparation Error:', error);
            ctx.error = error as Error;
            return State.ERROR;
        }
    }

    /**
     * Loop 2a: App Generation
     * Generates the app code using the validated tools
     */
    private async handleAppGeneration(ctx: StateMachineContext): Promise<State> {
        console.log(`[StateMachine] Entering App Generation (Attempt ${ctx.appGenerationAttempts + 1})`);
        ctx.appGenerationAttempts++;

        const userPrompt = ctx.request.body?.prompt || ctx.request.query?.prompt || 'Generate an app based on the available tools and context.';

        // Add review/verification feedback to prompt if retrying
        let expandedPrompt = userPrompt;
        if (ctx.reviewFeedback && ctx.reviewFeedback.length > 0) {
            expandedPrompt += `\n\nPREVIOUS CODE REVIEW FAILURES (FIX THESE): \n${ctx.reviewFeedback.join('\n')}`;
        }
        if (ctx.verificationIssues && ctx.verificationIssues.length > 0) {
            expandedPrompt += `\n\nPREVIOUS QA VERIFICATION ISSUES (FIX THESE): \n${ctx.verificationIssues.join('\n')}`;
        }
        if (ctx.diagnosisContext) {
            expandedPrompt += `\n\nDIAGNOSIS CONTEXT: ${ctx.diagnosisContext}. ${ctx.appCodeFix || ''}`;
        }

        try {
            const context = {
                appId: ctx.targetAppId || `app-${ctx.sessionId}-${Date.now()}`,
                apiRoot: ctx.apiRoot,
                tools: (ctx.matchedTool ? [ctx.matchedTool] : ctx.requiredTools).map(t => ({
                    name: t.name,
                    description: t.description,
                    endpoint: t.apiEndpoint,
                    responseSample: t.responseSample
                })),
                existingContent: ctx.cachedAppMeta ? ctx.cachedApp?.html : undefined
            };

            const result = await this.aiPlanner.generateApp(expandedPrompt, context);

            // Store result temporarily in ctx.generatedApp (using cache structure)
            ctx.generatedApp = {
                id: context.appId,
                sessionId: ctx.sessionId,
                prompt: userPrompt, // Store original prompt
                isLiveUpdating: result.isLiveUpdating || false,
                lastUpdated: Date.now(),
                toolsUsed: ctx.requiredTools.map(t => t.name),
                html: result.html,
                js: result.js,
                css: result.css
            };

            return State.APP_REVIEW;

        } catch (error) {
            console.error('[StateMachine] App Generation Error:', error);
            ctx.error = error as Error;
            return State.ERROR;
        }
    }

    /**
     * Loop 2b: App Review
     * AI validates code against tool usage rules
     */
    private async handleAppReview(ctx: StateMachineContext): Promise<State> {
        if (!ctx.generatedApp || !ctx.generatedApp.html) {
            return State.ERROR;
        }

        console.log('[StateMachine] Reviewing App Code...');

        try {
            const review = await this.aiPlanner.reviewAppCode(
                ctx.generatedApp.html,
                ctx.requiredTools
            );

            if (review.passed) {
                console.log('[StateMachine] App Review PASSED');
                ctx.reviewFeedback = []; // Clear feedback
                return State.APP_VERIFICATION;
            }

            console.log('[StateMachine] App Review FAILED:', review.issues);

            // If the reviewer auto-corrected the code, use it!
            if (review.correctedCode) {
                console.log('[StateMachine] Applying reviewer auto-correction...');
                ctx.generatedApp.html = review.correctedCode;
                // We trust the correction and move to verify
                return State.APP_VERIFICATION;
            }

            // Otherwise, loop back to generation with feedback
            ctx.reviewFeedback = review.issues;

            // Safety check for infinite loops
            if (ctx.appGenerationAttempts >= 3) {
                console.warn('[StateMachine] Max app generation attempts reached during review. Proceeding anyway.');
                return State.APP_VERIFICATION;
            }

            return State.APP_GENERATION;

        } catch (error) {
            console.error('[StateMachine] App Review Error:', error);
            // Fail open ensures we don't get stuck if review crashes
            return State.APP_VERIFICATION;
        }
    }

    /**
     * Loop 2c: App Verification
     * AI checks if user requirements are met
     */
    private async handleAppVerification(ctx: StateMachineContext): Promise<State> {
        if (!ctx.generatedApp || !ctx.generatedApp.html) {
            return State.ERROR;
        }

        console.log('[StateMachine] Verifying requirements...');

        try {
            const verify = await this.aiPlanner.verifyRequirements(
                ctx.generatedApp.html,
                ctx.generatedApp.prompt // Check against original user prompt
            );

            if (verify.verified) {
                console.log('[StateMachine] Verification PASSED');
                ctx.verificationIssues = [];

                // Success! Move to return
                // First update the cache with the finalized app
                this.appCache.set(ctx.generatedApp);
                ctx.targetAppId = ctx.generatedApp.id;

                return State.APP_RETURNED;
            }

            console.log('[StateMachine] Verification FAILED:', verify.missingRequirements);
            ctx.verificationIssues = verify.missingRequirements;

            if (verify.suggestion) {
                ctx.verificationIssues.push(`Suggestion: ${verify.suggestion}`);
            }

            // Safety check for infinite loops
            if (ctx.appGenerationAttempts >= 5) { // Allow a bit more for requirements
                console.warn('[StateMachine] Max app generation attempts reached during verification. Returning best effort.');
                this.appCache.set(ctx.generatedApp);
                ctx.targetAppId = ctx.generatedApp.id;
                return State.APP_RETURNED;
            }

            return State.APP_GENERATION;

        } catch (error) {
            console.error('[StateMachine] Verification Error:', error);
            // Fail open
            this.appCache.set(ctx.generatedApp);
            ctx.targetAppId = ctx.generatedApp.id;
            return State.APP_RETURNED;
        }
    }

    private async handleToolAgent(ctx: StateMachineContext): Promise<State> {
        // Tools are ready - move to app builder
        // If this is tool-only request (no app generation), execute and return
        if (ctx.intent === 'tool_only' && ctx.requiredTools.length > 0) {
            try {
                const tool = ctx.requiredTools[0];
                const result = await this.executeToolWithRetry(tool, ctx.matchedArgs || {});
                try {
                    ctx.response = JSON.parse(result);
                } catch {
                    ctx.response = { result };
                }
                return State.END;
            } catch (error) {
                // executeToolWithRetry handles retries and returns error JSON on failure
                // but if something unexpected happens:
                ctx.error = error as Error;
                return State.ERROR;
            }
        }

        return State.APP_BUILDER;
    }

    private async handleAppBuilder(ctx: StateMachineContext): Promise<State> {
        // Generate or update the app
        try {
            const appId = ctx.targetAppId || `app_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

            // Build tools context with apiRoot pattern
            const toolsContext = ctx.requiredTools.map(t => ({
                name: t.name,
                description: t.description,
                endpoint: `${ctx.apiRoot}/${t.name}`,
                responseSample: t.responseSample,
            }));

            // Get existing app content for update context
            const existingContent = ctx.cachedApp?.html;

            // Build prompt for app generation
            const appPrompt = this.buildAppPrompt(ctx, toolsContext, existingContent);

            // Call AI to generate app
            const llmResult = await this.aiPlanner.generateApp(appPrompt, {
                appId,
                apiRoot: ctx.apiRoot,
                tools: toolsContext,
                existingContent,
            });

            // Create the cached app
            ctx.generatedApp = {
                id: appId,
                sessionId: ctx.sessionId,
                prompt: typeof ctx.request.body?.prompt === 'string' ? ctx.request.body.prompt : 'Generated app',
                html: llmResult.html,
                js: llmResult.js,
                css: llmResult.css,
                isLiveUpdating: llmResult.isLiveUpdating ?? false,
                lastUpdated: Date.now(),
                toolsUsed: ctx.requiredTools.map(t => t.name),
            };

            ctx.isLiveUpdating = ctx.generatedApp.isLiveUpdating;

            // Store in cache
            this.appCache.set(ctx.generatedApp);

            return State.APP_RETURNED;
        } catch (error) {
            ctx.error = error as Error;
            return State.ERROR;
        }
    }

    private async handleAppReturned(ctx: StateMachineContext): Promise<State> {
        // Prepare response
        if (!ctx.generatedApp) {
            ctx.error = new Error('No generated app in context');
            return State.ERROR;
        }

        ctx.response = {
            appId: ctx.generatedApp.id,
            html: ctx.generatedApp.html,
            js: ctx.generatedApp.js,
            css: ctx.generatedApp.css,
            isLiveUpdating: ctx.generatedApp.isLiveUpdating,
            toolsUsed: ctx.generatedApp.toolsUsed,
        };

        // If live updating, register in the loop
        if (ctx.isLiveUpdating) {
            return State.LIVE_UPDATING_LOOP;
        }

        return State.END;
    }

    private async handleLiveUpdatingLoop(ctx: StateMachineContext): Promise<State> {
        // App is registered in cache with isLiveUpdating=true
        // The background loop will pick it up
        console.log(`[StateMachine] App ${ctx.generatedApp?.id} registered for live updates`);
        return State.END;
    }

    private async handleBackgroundUpdate(ctx: StateMachineContext): Promise<State> {
        // Called by background loop to update live apps
        // This checks if the app's data sources have changed
        if (!ctx.cachedApp) {
            return State.END;
        }

        // Re-trigger app builder with existing app context
        ctx.targetAppId = ctx.cachedApp.id;
        ctx.requiredTools = ctx.cachedApp.toolsUsed.map(name =>
            this.toolManager.getTool(name)
        ).filter((t): t is ToolDefinition => t !== undefined);

        return State.APP_BUILDER;
    }

    // ==================== Helper Methods ====================

    private buildIntentPrompt(request: RequestData, cachedApps: CachedAppMeta[]): string {
        const appsList = cachedApps.length > 0
            ? cachedApps.map(a => `- ${a.id}: "${a.prompt}"`).join('\n')
            : 'No existing apps';

        return `
Analyze this request and determine the user's intent:

Request: ${request.method} ${request.path}
Query: ${JSON.stringify(request.query)}
Body: ${JSON.stringify(request.body)}

Existing Apps in Session:
${appsList}

Determine:
1. Is this a request to CREATE a new app/widget?
2. Is this a request to UPDATE an existing app? If so, which one?
3. Is this just a tool/data request with no app generation needed?
4. What tools are needed to fulfill this request?
5. Does a new tool need to be created?
`.trim();
    }

    private buildAppPrompt(
        ctx: StateMachineContext,
        tools: Array<{ name: string; description: string; endpoint: string; responseSample?: string }>,
        existingContent?: string
    ): string {
        const toolsInfo = tools.map(t =>
            `- ${t.name}: ${t.description}\n  Endpoint: ${t.endpoint}\n  Sample: ${t.responseSample || 'N/A'}`
        ).join('\n');

        const updateContext = existingContent
            ? `\n\nEXISTING APP CONTENT (update this):\n${existingContent.slice(0, 2000)}...`
            : '';

        return `
Generate a responsive HTML/JS widget app.

USER REQUEST: ${ctx.request.body?.prompt || ctx.request.path}

AVAILABLE TOOLS (use these endpoints for data):
${toolsInfo}

API ROOT: ${ctx.apiRoot}
APP ID: ${ctx.targetAppId || 'new_app'}

IMPORTANT:
- Use fetch() to call tool endpoints: fetch('${ctx.apiRoot}/{tool_name}', {...})
- Make the UI responsive and modern
- Return JSON with: { html, js (optional), css (optional), isLiveUpdating }
- Set isLiveUpdating=true if the app needs periodic data refresh
${updateContext}
`.trim();
    }
}
