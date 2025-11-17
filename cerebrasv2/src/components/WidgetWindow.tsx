import { useCallback, useEffect, useRef } from 'react';
import type { WidgetInstance } from '../types';

interface WidgetWindowProps {
  widget: WidgetInstance;
  onClose: () => void;
  onMove: (position: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
  onFocus: () => void;
}

export function WidgetWindow({
  widget,
  onClose,
  onMove,
  onResize,
  onFocus,
}: WidgetWindowProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  const startPointerSession = useCallback(
    (event: React.PointerEvent, mode: 'move' | 'resize') => {
      event.preventDefault();
      const startX = event.clientX;
      const startY = event.clientY;
      const startPos = { ...widget.position };
      const startSize = { ...widget.size };

      const handleMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        if (mode === 'move') {
          onMove({
            x: Math.max(16, Math.round(startPos.x + deltaX)),
            y: Math.max(16, Math.round(startPos.y + deltaY)),
          });
        } else {
          onResize({
            width: Math.max(220, Math.round(startSize.width + deltaX)),
            height: Math.max(140, Math.round(startSize.height + deltaY)),
          });
        }
      };

      const stop = () => {
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', stop);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', stop, { once: true });
    },
    [onMove, onResize, widget.position, widget.size],
  );

  useEffect(() => {
    if (!widget.scripts?.length) return;
    const container = nodeRef.current;
    if (!container) return;
    const scriptElements: HTMLScriptElement[] = [];
    widget.scripts.forEach((code) => {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.text = code;
      container.appendChild(script);
      scriptElements.push(script);
    });
    return () => {
      scriptElements.forEach((script) => {
        script.remove();
      });
    };
  }, [widget.id, widget.scripts?.join('::') ?? '', widget.lastUpdated]);

  return (
    <article
      ref={nodeRef}
      className="widget-window"
      style={{
        transform: `translate(${widget.position.x}px, ${widget.position.y}px)`,
        width: `${widget.size.width}px`,
        height: `${widget.size.height}px`,
        zIndex: widget.zIndex ?? (widget.liveData ? 2 : 1),
      }}
      onPointerDown={onFocus}
    >
      <header
        className="widget-header"
        onPointerDown={(event) => startPointerSession(event, 'move')}
      >
        <div className="widget-meta">
          {widget.liveData ? (
            <span className="live-indicator" title="Live data feed enabled">
              LIVE
            </span>
          ) : null}
          {widget.origin === 'context' ? (
            <span className="context-indicator" title="Mirrored from context loop">
              CTX
            </span>
          ) : null}
          <strong className="widget-title">{widget.prompt}</strong>
        </div>
        <div className="widget-actions">
          <button onClick={onClose} title="Close applet">
            ×
          </button>
        </div>
      </header>

      <section className="widget-body">
        <div
          className="widget-html"
          dangerouslySetInnerHTML={{ __html: widget.html }}
        />
      </section>

      {widget.explanation ? (
        <footer className="widget-footer">
          <span>{widget.explanation}</span>
        </footer>
      ) : null}

      <span
        className="widget-resize"
        onPointerDown={(event) => startPointerSession(event, 'resize')}
        title="Drag to resize"
      />
    </article>
  );
}
