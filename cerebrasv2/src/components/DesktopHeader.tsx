interface DesktopHeaderProps {
  sessionSuffix: string;
  contextCount: number;
  busy: boolean;
  promptInput: string;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
}

export function DesktopHeader({
  sessionSuffix,
  contextCount,
  busy,
  promptInput,
  onPromptChange,
  onSubmit,
}: DesktopHeaderProps) {
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <header className="desktop-topbar">
      <div className="topbar-left">
        <span className="brand">cerebras os</span>
        <span className="session-chip">session · {sessionSuffix}</span>
      </div>
      <form className="inline-command-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Summon a new window"
          value={promptInput}
          onChange={(event) => onPromptChange(event.target.value)}
          disabled={busy}
        />
        <button type="submit" disabled={busy}>
          {busy ? 'Working…' : 'Add'}
        </button>
      </form>
      <div className="topbar-right">
        <span className="context-chip">
          context <strong>{contextCount}</strong>
        </span>
      </div>
    </header>
  );
}
