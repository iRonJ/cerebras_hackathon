import type { BackgroundProcess } from '../types';

interface BackgroundStatusProps {
  processes: BackgroundProcess[];
}

export function BackgroundStatus({ processes }: BackgroundStatusProps) {
  if (processes.length === 0) {
    return (
      <section className="background-processes-panel">
        <span className="background-empty">
          AI context loop idle — add a live tile to wake it up.
        </span>
      </section>
    );
  }

  return (
    <section className="background-processes-panel">
      <div className="background-processes">
        {processes.map((process) => (
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
        ))}
      </div>
    </section>
  );
}
