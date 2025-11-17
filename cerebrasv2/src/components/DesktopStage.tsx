import type { WidgetInstance } from '../types';
import { WidgetWindow } from './WidgetWindow';

interface DesktopStageProps {
  widgets: WidgetInstance[];
  onCloseWidget: (id: string) => void;
  onMoveWidget: (id: string, position: { x: number; y: number }) => void;
  onResizeWidget: (
    id: string,
    size: { width: number; height: number },
  ) => void;
  onFocusWidget: (id: string) => void;
}

export function DesktopStage({
  widgets,
  onCloseWidget,
  onMoveWidget,
  onResizeWidget,
  onFocusWidget,
}: DesktopStageProps) {
  return (
    <section className="desktop-stage">
      <div className="desktop-canvas">
        {widgets.map((widget) => (
          <WidgetWindow
            key={widget.id}
            widget={widget}
            onClose={() => onCloseWidget(widget.id)}
            onMove={(position) => onMoveWidget(widget.id, position)}
            onResize={(size) => onResizeWidget(widget.id, size)}
            onFocus={() => onFocusWidget(widget.id)}
          />
        ))}
      </div>
    </section>
  );
}
