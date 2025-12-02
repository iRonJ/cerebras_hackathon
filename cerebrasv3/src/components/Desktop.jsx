import React, { useState, useEffect } from 'react';
import WindowFrame from './WindowFrame';
import Taskbar from './Taskbar';
import DevDrawer from './DevDrawer';
import AIWidget from './AIWidget';
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

  const openAIWidget = () => {
    const id = 'ai-widget';
    const existing = windows.find(w => w.id === id);
    if (existing) {
      focusWindow(id);
      if (existing.isMinimized) toggleMinimize(id);
      return;
    }

    const newWindow = {
      id,
      title: 'AI Assistant',
      component: <AIWidget onOpenWindow={openWindow} />,
      x: 150,
      y: 150,
      width: 500,
      height: 400,
      zIndex: nextZIndex,
      isMinimized: false,
      isMaximized: false,
      preMaximizeState: null,
      customCss: ''
    };

    setWindows([...windows, newWindow]);
    setNextZIndex(nextZIndex + 1);
  };

  const closeWindow = (id) => {
    setWindows(windows.filter(w => w.id !== id));
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
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <button onClick={() => openWindow('window-1', 'My App')} style={{ padding: 10, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8 }}>
          📁 Open App 1
        </button>
        <button onClick={() => openWindow('window-2', 'Clock')} style={{ padding: 10, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8 }}>
          ⏰ Open Clock
        </button>
        <button onClick={openAIWidget} style={{ padding: 10, background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: 8 }}>
          🤖 AI Assistant
        </button>
      </div>

      {/* Dev Drawer Toggle */}
      <button
        onClick={() => setIsDevDrawerOpen(true)}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
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
          updatePosition={updatePosition}
          updateSize={updateSize}
        />
      ))}

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
