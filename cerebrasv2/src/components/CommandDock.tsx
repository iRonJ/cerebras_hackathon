import { useEffect, useRef, useState } from 'react';
import type { BackgroundProcess } from '../types';

interface CommandDockProps {
  busy: boolean;
  error: string | null;
  onSubmitPrompt: (prompt: string) => void;
  backgroundProcesses: BackgroundProcess[];
}

export function CommandDock({
  busy,
  error,
  onSubmitPrompt,
  backgroundProcesses,
}: CommandDockProps) {
  const [prompt, setPrompt] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const text = prompt.trim();
    if (!text || busy) return;
    onSubmitPrompt(text);
    setPrompt('');
  };

  return (
    <section className="command-dock">
      <form className="command-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          placeholder="What applet should I render for you?"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : 'Add Applet'}
        </button>
      </form>

      {error ? <p className="command-error">{error}</p> : null}

      <div className="background-processes">
        {backgroundProcesses.length === 0 ? (
          <span className="background-empty">
            The AI context loop is idle — add a live tile to wake it up.
          </span>
        ) : (
          backgroundProcesses.map((process) => (
            <span
              key={process.key}
              className={`background-pill status-${process.status}`}
              title={
                process.message ||
                (process.lastRun
                  ? `Updated ${new Date(process.lastRun).toLocaleTimeString()}`
                  : '')
              }
            >
              {process.status === 'pending' && '⏳'}
              {process.status === 'running' && '⚙️'}
              {process.status === 'ready' && '✅'}
              {process.status === 'error' && '⚠️'} {process.prompt}
            </span>
          ))
        )}
      </div>
    </section>
  );
}
