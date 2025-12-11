import React, { useState, useEffect } from 'react';

const DevDrawer = ({ isOpen, onClose, windows, onUpdateContent, onUpdateCss }) => {
  const [selectedWindowId, setSelectedWindowId] = useState(null);
  const [activeTab, setActiveTab] = useState('content'); // 'content' or 'css'
  const [editorContent, setEditorContent] = useState('');
  const [cssContent, setCssContent] = useState('');

  // Update editor content when selection changes
  useEffect(() => {
    if (selectedWindowId) {
      const win = windows.find(w => w.id === selectedWindowId);
      if (win) {
        setEditorContent(win.content);
        setCssContent(win.customCss || '');
      }
    } else if (windows.length > 0) {
      setSelectedWindowId(windows[0].id);
    }
  }, [selectedWindowId, windows]);

  const handleSave = () => {
    if (selectedWindowId) {
      if (activeTab === 'content') {
        onUpdateContent(selectedWindowId, editorContent);
      } else {
        onUpdateCss(selectedWindowId, cssContent);
      }
    }
  };

  const applyPreset = (preset) => {
    let css = '';
    if (preset === 'christmas') {
      css = `/* Christmas Theme */
.window-inner {
  border: 2px solid #d42426;
  box-shadow: 0 0 15px rgba(212, 36, 38, 0.5);
}
&::before {
  content: '❄️';
  position: absolute;
  top: -15px;
  left: -10px;
  font-size: 24px;
  z-index: 20;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}
&::after {
  content: '';
  position: absolute;
  top: -8px;
  left: 0;
  right: 0;
  height: 12px;
  background: repeating-linear-gradient(45deg, #d42426, #d42426 10px, #fff 10px, #fff 20px);
  border-radius: 6px 6px 0 0;
  z-index: 10;
}`;
    } else if (preset === 'cyberpunk') {
      css = `/* Cyberpunk Theme */
.window-inner {
  border: 1px solid #0ff;
  box-shadow: 0 0 10px #0ff, inset 0 0 20px rgba(0, 255, 255, 0.2);
  background: rgba(0, 0, 0, 0.9);
  border-radius: 0;
}
.window-title {
  font-family: 'Courier New', monospace;
  color: #0ff;
  text-transform: uppercase;
  letter-spacing: 2px;
}
&::after {
  content: 'SYSTEM_OVERRIDE';
  position: absolute;
  bottom: -20px;
  right: 0;
  color: #0ff;
  font-size: 10px;
  font-family: monospace;
  text-shadow: 0 0 5px #0ff;
}`;
    }
    setCssContent(css);
  };

  if (!isOpen) return null;

  return (
    <div className="dev-drawer" style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '400px',
      height: '100%',
      background: 'rgba(20, 20, 30, 0.95)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
      zIndex: 10000,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
      transition: 'transform 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#fff', fontSize: '18px' }}>Developer Controls</h2>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '20px' }}>✕</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '12px' }}>SELECT WINDOW</label>
        <select
          value={selectedWindowId || ''}
          onChange={(e) => setSelectedWindowId(e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: 'white',
            borderRadius: '4px'
          }}
        >
          {windows.map(w => (
            <option key={w.id} value={w.id}>{w.title} ({w.id})</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
        <button
          onClick={() => setActiveTab('content')}
          style={{
            flex: 1,
            padding: '8px',
            background: activeTab === 'content' ? 'rgba(100, 108, 255, 0.2)' : 'transparent',
            border: '1px solid ' + (activeTab === 'content' ? '#646cff' : 'rgba(255,255,255,0.1)'),
            color: activeTab === 'content' ? '#fff' : '#aaa',
            borderRadius: '4px'
          }}
        >
          HTML / JS
        </button>
        <button
          onClick={() => setActiveTab('css')}
          style={{
            flex: 1,
            padding: '8px',
            background: activeTab === 'css' ? 'rgba(100, 108, 255, 0.2)' : 'transparent',
            border: '1px solid ' + (activeTab === 'css' ? '#646cff' : 'rgba(255,255,255,0.1)'),
            color: activeTab === 'css' ? '#fff' : '#aaa',
            borderRadius: '4px'
          }}
        >
          Frame CSS
        </button>
      </div>

      {activeTab === 'css' && (
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '12px' }}>LOAD PRESET</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => applyPreset('christmas')}
              style={{ flex: 1, padding: '6px', background: '#d42426', color: 'white', border: 'none', borderRadius: '4px', fontSize: '12px' }}
            >
              🎄 Christmas
            </button>
            <button
              onClick={() => applyPreset('cyberpunk')}
              style={{ flex: 1, padding: '6px', background: '#0ff', color: '#000', border: 'none', borderRadius: '4px', fontSize: '12px' }}
            >
              🤖 Cyberpunk
            </button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <textarea
          value={activeTab === 'content' ? editorContent : cssContent}
          onChange={(e) => activeTab === 'content' ? setEditorContent(e.target.value) : setCssContent(e.target.value)}
          placeholder={activeTab === 'content' ? 'Enter HTML...' : 'Enter CSS for .window-frame...'}
          style={{
            flex: 1,
            width: '100%',
            background: '#0f0f1a',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#a5b3ce',
            fontFamily: 'monospace',
            padding: '10px',
            borderRadius: '4px',
            resize: 'none',
            fontSize: '12px',
            lineHeight: '1.5'
          }}
          spellCheck="false"
        />
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            padding: '10px',
            background: '#646cff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: '500'
          }}
        >
          {activeTab === 'content' ? 'Update Content' : 'Update Styles'}
        </button>
      </div>
    </div>
  );
};

export default DevDrawer;
