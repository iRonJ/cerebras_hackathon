# Cerebras OS - OpenRouter Hackathon Project

A real-time, widget-based OS interface powered by Cerebras' ultra-fast LLM inference through OpenRouter.

## Overview

This project showcases the power of Cerebras' fast inference capabilities by creating a responsive, widget-based interface where every user interaction is mediated by an LLM in real-time. Built using Blazor Server and .NET 8, it demonstrates how Cerebras' speed enables new UI paradigms where AI can be embedded directly in the interaction loop.

## Key Features

- **Real-time LLM Interactions**: Leveraging Cerebras' fast inference times to enable immediate responses to user interactions
- **Live-updating Widgets**: Dynamic widgets that can auto-update based on LLM decisions
- **Contextual Background Processing**: Uses OpenRouter's search capabilities to enrich widget context asynchronously
- **Draggable UI Components**: Modern, flexible interface with draggable and resizable widgets

## Architecture

The system is built around a single primary API endpoint - Cerebras inference through OpenRouter. This architecture decision was made possible by Cerebras' exceptional speed, allowing us to use their LLM for everything from UI generation to decision-making.

### Components:

1. **OpenRouterService**: Core service that interfaces with Cerebras through OpenRouter
   - Uses qwen3-32b model exclusively on Cerebras hardware
   - Handles structured JSON output for widget generation
   - Manages context injection for stateful interactions

2. **UserSessionState**: Background processing system
   - Maintains widget state
   - Manages asynchronous context updates through OpenRouter search
   - Handles live data refresh for dynamic widgets

3. **Interactive UI**:
   - Real-time widget generation and updates
   - Drag-and-drop interface
   - Live data indicators
   - Automatic state management

## Performance

The system's responsiveness is made possible by Cerebras' infrastructure:
- Sub-second response times for widget generation
- Real-time UI updates based on LLM decisions
- Smooth interaction even with multiple live-updating widgets

## Technical Stack

- .NET 8 Blazor Server
- Cerebras inference (via OpenRouter)
- Background processing for context enrichment
- Real-time WebSocket communications
- Modern CSS for widget styling

## Getting Started

1. Clone the repository
2. Set your OpenRouter API key:
   ```bash
   export OPENROUTER_API_KEY=your_key_here
   ```
3. Run the application:
   ```bash
   dotnet run
   ```

## Architecture Notes

This project demonstrates a new paradigm in UI development where the LLM is fast enough to be part of the immediate interaction loop, rather than an asynchronous backend service. This is only possible because of Cerebras' inference speed, allowing us to:

- Generate HTML in real-time
- Make instant decisions about widget behavior
- Provide immediate feedback to user actions
- Handle multiple concurrent updates

The background queue for OpenRouter search provides additional context without impacting the main interaction loop, enriching the LLM's responses while maintaining responsiveness.
