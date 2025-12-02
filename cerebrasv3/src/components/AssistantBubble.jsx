import React, { useState, useEffect, useRef } from 'react';

const AssistantBubble = ({ isOpen, onClose, onSubmit, targetId, position }) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        await onSubmit(prompt, targetId);
        setLoading(false);
        setPrompt('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'absolute',
            top: position ? position.top : 70,
            left: position ? position.left : 'auto',
            right: position ? 'auto' : 20,
            width: 300,
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            padding: '15px',
            zIndex: 9001,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            border: '1px solid #eee'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: '#333' }}>
                    {targetId ? 'Refine Window' : 'New Request'}
                </span>
                <button
                    onClick={onClose}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#999' }}
                >
                    &times;
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={targetId ? "How should I change this?" : "What do you need?"}
                    style={{
                        width: '100%',
                        height: '80px',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid #ddd',
                        resize: 'none',
                        marginBottom: '10px',
                        fontFamily: 'inherit'
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e);
                        }
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        type="submit"
                        disabled={loading || !prompt.trim()}
                        style={{
                            padding: '8px 16px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            opacity: loading || !prompt.trim() ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Thinking...' : 'Send'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssistantBubble;
