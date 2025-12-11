import React, { useState, useEffect, useRef } from 'react';

const WindowFrame = ({ window, onClose, onMinimize, onMaximize, onFocus, onRefine, updatePosition, updateSize }) => {
  const { id, title, content, x, y, width, height, zIndex, isMinimized, isMaximized, customCss } = window;
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef(null);

  // Handle Dragging
  const handleMouseDown = (e) => {
    if (e.target.closest('.window-controls') || isMaximized) return;
    onFocus(id);
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - x,
      y: e.clientY - y
    });
  };

  // Handle Resizing
  const handleResizeMouseDown = (e) => {
    e.stopPropagation();
    onFocus(id);
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        updatePosition(id, e.clientX - dragOffset.x, e.clientY - dragOffset.y);
      }
      if (isResizing) {
        // Simple resizing logic: new width = mouseX - windowX
        // In a real app, we'd handle min-width/height
        const newWidth = Math.max(200, e.clientX - x);
        const newHeight = Math.max(150, e.clientY - y);
        updateSize(id, newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, x, y, id, updatePosition, updateSize]);

  return (
    <div
      ref={windowRef}
      data-window-id={id}
      className={`window-frame ${zIndex === 100 ? 'active' : ''}`}
      style={{
        left: x,
        top: y,
        width: width,
        height: height,
        zIndex: zIndex,
        display: isMinimized ? 'none' : 'block'
      }}
      onMouseDown={() => onFocus(id)}
    >
      {/* Inject Custom CSS */}
      {customCss && <style>{`.window-frame[style*="z-index: ${zIndex}"] { ${customCss} }`}</style>}

      <div className="window-inner">
        <div className="window-header" onMouseDown={handleMouseDown}>
          <div className="window-title">{title}</div>
          <div className="window-controls">
            <button className="control-btn refine" onClick={(e) => { e.stopPropagation(); onRefine(id); }} title="Refine">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button className="control-btn minimize" onClick={(e) => { e.stopPropagation(); onMinimize(id); }} title="Minimize"></button>
            <button className="control-btn maximize" onClick={(e) => { e.stopPropagation(); onMaximize(id); }} title="Maximize"></button>
            <button className="control-btn close" onClick={(e) => { e.stopPropagation(); onClose(id); }} title="Close"></button>
          </div>
        </div>
        <div className="window-content">
          {window.component ? (
            window.component
          ) : (
            <iframe
              srcDoc={content}
              title={`Window ${id}`}
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>
      </div>

      {/* Resize Handle */}
      {
        !isMaximized && (
          <div
            className="resize-handle"
            onMouseDown={handleResizeMouseDown}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: '16px',
              height: '16px',
              cursor: 'nwse-resize',
              zIndex: 10
            }}
          />
        )
      }

      {/* Scoped CSS Application */}
      {
        customCss && (
          <style>{`
           [data-window-id="${id}"] {
             ${customCss}
           }
         `}</style>
        )
      }
    </div >
  );
};

export default WindowFrame;
