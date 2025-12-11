import React from 'react';

const Taskbar = ({ windows, onRestore, onToggleMinimize }) => {
  return (
    <div className="taskbar">
      {windows.map((win) => (
        <button
          key={win.id}
          className={`taskbar-item ${!win.isMinimized && win.zIndex === Math.max(...windows.map(w => w.zIndex)) ? 'active' : ''}`}
          onClick={() => onToggleMinimize(win.id)}
          title={win.title}
        >
          {/* Simple icon placeholder */}
          <span>🖥️</span>
        </button>
      ))}
    </div>
  );
};

export default Taskbar;
