import React, { useState, useEffect } from 'react';
import WindowFrame from './WindowFrame';
import Taskbar from './Taskbar';
import DevDrawer from './DevDrawer';
import AssistantBubble from './AssistantBubble';
import { fetchWindowContent } from '../services/api';
import '../styles/desktop.css';

const Desktop = () => {
  const [windows, setWindows] = useState([]);
  const [nextZIndex, setNextZIndex] = useState(100);

  // Function to open a new window
  const openWindow = async (id, title, content = null, options = {}) => {
    // Check if already open
    const existing = windows.find(w => w.id === id);
    if (existing) {
      focusWindow(id);
      if (existing.isMinimized) {
        toggleMinimize(id);
      }
      return;
    }

    // Fetch content if not provided
    let html = content;
    if (!html) {
      const res = await fetchWindowContent(id);
      html = res.html;
    }

    const newWindow = {
      id,
      title,
      content: html,
      x: 100 + (windows.length * 30),
      y: 100 + (windows.length * 30),
      width: options.width || 400,
      height: options.height || 300,
      zIndex: nextZIndex,
      isMinimized: false,
      isMaximized: false,
      preMaximizeState: null,
      customCss: ''
    };



    setWindows([...windows, newWindow]);
    setNextZIndex(nextZIndex + 1);
  };

  const [assistantOpen, setAssistantOpen] = useState(false);
  const [refineTargetId, setRefineTargetId] = useState(null);
  const [sessionId] = useState(() => 'session-' + Math.random().toString(36).substr(2, 9));

  const [bubblePosition, setBubblePosition] = useState(null);

  const openAssistant = (targetId = null) => {
    setRefineTargetId(targetId);
    if (targetId) {
      const targetWindow = windows.find(w => w.id === targetId);
      if (targetWindow) {
        setBubblePosition({
          top: targetWindow.y + 40, // Below title bar
          left: targetWindow.x + targetWindow.width - 320 // Aligned to right
        });
      }
    } else {
      setBubblePosition(null); // Default position
    }
    setAssistantOpen(true);
  };

  const handleAssistantSubmit = async (prompt, targetId) => {
    try {
      let contextSnapshot = {};
      if (targetId) {
        const targetWindow = windows.find(w => w.id === targetId);
        if (targetWindow) {
          // Extract tools used from the content by finding fetch calls to /api/mono/
          // Note: We don't send current_content because server caches it in session.widgets
          const content = targetWindow.content || '';
          const toolMatches = content.match(/\/api\/mono\/([a-z_]+)/gi) || [];
          const toolsUsed = [...new Set(toolMatches.map(m => m.replace('/api/mono/', '')))].join(',');

          contextSnapshot = {
            window_title: targetWindow.title,
            tools_used: toolsUsed
            // current_content is NOT sent - server retrieves from session.widgets cache
          };
        }
      }

      const payload = {
        sessionId,
        intent: 'create_widget',
        prompt,
        targetWidgetId: targetId,
        contextSnapshot
      };
      console.log('[Desktop] Sending request:', payload);

      const res = await fetch('/api/desktop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.widgets && data.widgets.length > 0) {
        setWindows(prevWindows => {
          let newWindows = [...prevWindows];
          let currentZIndex = nextZIndex;

          data.widgets.forEach(widget => {
            const existingIndex = newWindows.findIndex(w => w.id === widget.id);

            if (existingIndex !== -1) {
              // Update existing window - ONLY update content and metadata, preserve position!
              const existing = newWindows[existingIndex];
              newWindows[existingIndex] = {
                ...existing,  // Preserve ALL existing properties first (x, y, width, height, etc.)
                content: widget.html,
                title: widget.title || existing.title,
                zIndex: currentZIndex++,
                isMinimized: false
                // Explicitly NOT setting x, y, width, height to preserve user's positioning
              };
              // Only update size if explicitly provided by server AND different
              if (widget.width && widget.width !== existing.width) {
                newWindows[existingIndex].width = widget.width;
              }
              if (widget.height && widget.height !== existing.height) {
                newWindows[existingIndex].height = widget.height;
              }
            } else {
              // Create new window
              newWindows.push({
                id: widget.id,
                title: widget.title || 'AI Window',
                content: widget.html,
                x: 100 + (newWindows.length * 30),
                y: 100 + (newWindows.length * 30),
                width: widget.width || 400,
                height: widget.height || 300,
                zIndex: currentZIndex++,
                isMinimized: false,
                isMaximized: false,
                preMaximizeState: null,
                customCss: ''
              });
            }
          });

          return newWindows;
        });

        setNextZIndex(prev => prev + data.widgets.length);
      }
    } catch (err) {
      console.error(err);
      alert('Error communicating with AI');
    }
  };

  const closeWindow = async (id) => {
    // Optimistically close locally
    setWindows(windows.filter(w => w.id !== id));

    try {
      await fetch('/api/desktop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          intent: 'close_widget',
          widgetId: id
        })
      });
    } catch (err) {
      console.error('Failed to close widget on server:', err);
    }
  };

  const focusWindow = (id) => {
    setWindows(windows.map(w => {
      if (w.id === id) {
        return { ...w, zIndex: nextZIndex };
      }
      return w;
    }));
    setNextZIndex(nextZIndex + 1);
  };

  const toggleMinimize = (id) => {
    setWindows(windows.map(w => {
      if (w.id === id) {
        return { ...w, isMinimized: !w.isMinimized };
      }
      return w;
    }));
  };

  const toggleMaximize = (id) => {
    setWindows(windows.map(w => {
      if (w.id === id) {
        if (w.isMaximized) {
          // Restore
          return {
            ...w,
            isMaximized: false,
            x: w.preMaximizeState.x,
            y: w.preMaximizeState.y,
            width: w.preMaximizeState.width,
            height: w.preMaximizeState.height,
            preMaximizeState: null
          };
        } else {
          // Maximize
          return {
            ...w,
            isMaximized: true,
            preMaximizeState: { x: w.x, y: w.y, width: w.width, height: w.height },
            x: 0,
            y: 0,
            width: '100%',
            height: 'calc(100% - 72px)' // Subtract taskbar space + margin
          };
        }
      }
      return w;
    }));
  };

  const updatePosition = (id, x, y) => {
    setWindows(windows.map(w => {
      if (w.id === id && !w.isMaximized) {
        return { ...w, x, y };
      }
      return w;
    }));
  };

  const updateSize = (id, width, height) => {
    setWindows(windows.map(w => {
      if (w.id === id && !w.isMaximized) {
        return { ...w, width, height };
      }
      return w;
    }));
  };

  const updateWindowCss = (id, css) => {
    setWindows(windows.map(w => {
      if (w.id === id) {
        return { ...w, customCss: css };
      }
      return w;
    }));
  };

  const updateWindowContent = (id, newContent) => {
    setWindows(windows.map(w => {
      if (w.id === id) {
        return { ...w, content: newContent };
      }
      return w;
    }));
  };

  const [isDevDrawerOpen, setIsDevDrawerOpen] = useState(false);

  return (
    <div className="desktop-container">
      {/* Desktop Icons (Shortcuts) */}
      {/* Plus Widget */}
      <button
        onClick={() => openAssistant(null)}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#007bff',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9000,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          padding: 0,
          lineHeight: 1
        }}
      >
        +
      </button>

      {/* Dev Drawer Toggle */}
      <button
        onClick={() => setIsDevDrawerOpen(true)}
        style={{
          position: 'absolute',
          top: 20,
          right: 80,
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.5)',
          color: '#aaa',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '20px',
          fontSize: '12px',
          zIndex: 9000
        }}
      >
        🛠 Dev Tools
      </button>

      {/* Windows */}
      {windows.map(window => (
        <WindowFrame
          key={window.id}
          window={window}
          onClose={closeWindow}
          onMinimize={toggleMinimize}
          onMaximize={toggleMaximize}
          onFocus={focusWindow}
          onRefine={openAssistant}
          updatePosition={updatePosition}
          updateSize={updateSize}
        />
      ))}

      <AssistantBubble
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        onSubmit={handleAssistantSubmit}
        targetId={refineTargetId}
        position={bubblePosition}
      />

      {/* Taskbar */}
      <Taskbar
        windows={windows}
        onToggleMinimize={toggleMinimize}
      />

      {/* Developer Drawer */}
      <DevDrawer
        isOpen={isDevDrawerOpen}
        onClose={() => setIsDevDrawerOpen(false)}
        windows={windows}
        onUpdateContent={updateWindowContent}
        onUpdateCss={updateWindowCss}
      />
    </div>
  );
};

export default Desktop;
