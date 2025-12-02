import React, { useState } from 'react';

const AIWidget = ({ onOpenWindow }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessionId] = useState(() => 'session-' + Math.random().toString(36).substr(2, 9));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/desktop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    intent: 'create_widget',
                    prompt
                })
            });
            const data = await res.json();
            if (data.widgets && data.widgets.length > 0) {
                const widget = data.widgets[data.widgets.length - 1];
                if (onOpenWindow) {
                    onOpenWindow(widget.id, widget.title || 'AI Window', widget.html, {
                        width: widget.width,
                        height: widget.height
                    });
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '10px', height: '100%', display: 'flex', flexDirection: 'column', color: 'black' }}>
            <form onSubmit={handleSubmit} style={{ marginBottom: '10px', display: 'flex', gap: '5px' }}>
                <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ask AI..."
                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '4px',
                        border: 'none',
                        background: '#007bff',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    {loading ? '...' : 'Go'}
                </button>
            </form>
            <div style={{ padding: '10px', color: '#666', fontStyle: 'italic' }}>
                Responses will open in new windows.
            </div>
        </div>
    );
};

export default AIWidget;
