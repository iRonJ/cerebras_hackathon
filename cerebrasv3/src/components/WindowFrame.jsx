import React, { useState, useEffect, useRef } from 'react';

const WindowFrame = ({ window, onClose, onMinimize, onMaximize, onFocus, updatePosition, updateSize }) => {
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
