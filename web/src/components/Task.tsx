import { useState } from 'react';

interface User { id: string; name: string; email: string; avatar_url?: string; avatar_data?: string; created_at: string; }
interface Label { id: string; name: string; color: string; }
interface TaskType {
  id: string; title: string; description: string | null;
  column_id: string; assignee_id: string | null; position: number;
  due_date?: string | null; priority?: string | null; labels?: string[];
  created_at: string; updated_at: string; assignee: User | null;
}

interface TaskProps {
  task: TaskType; users: User[]; labelCatalog: Label[];
  onDelete: (id: string) => void; onEdit: (t: TaskType) => void;
  onDragStart: (t: TaskType) => void; onDropOnTask: (id: string, above: boolean) => void;
}

const PRIORITY_LABEL: Record<string, { color: string; bg: string; border: string; text: string }> = {
  urgent: { color: '#f85149', bg: 'rgba(248,81,73,0.15)', border: 'rgba(248,81,73,0.4)', text: 'urgent' },
  high:   { color: '#d29922', bg: 'rgba(210,153,34,0.15)', border: 'rgba(210,153,34,0.4)', text: 'high' },
  medium: { color: '#58a6ff', bg: 'rgba(88,166,255,0.12)', border: 'rgba(88,166,255,0.35)', text: 'medium' },
  low:    { color: '#6e7681', bg: 'rgba(110,118,129,0.12)', border: 'rgba(110,118,129,0.3)', text: 'low' },
};

const LABEL_PALETTE = ['#8957e5','#db61a2','#0075ca','#0e8a16','#e4e669','#d73a4a','#f9d0c4','#e99695'];
const hashColor = (s: string) => {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xff;
  return LABEL_PALETTE[h % LABEL_PALETTE.length];
};

// GitHub issue open icon
const IssueIcon = ({ color = '#3fb950' }: { color?: string }) => (
  <svg className="flex-shrink-0" style={{ width: 16, height: 16 }} viewBox="0 0 16 16" fill={color}>
    <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
    <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
  </svg>
);

export default function Task({ task, labelCatalog, onDelete, onEdit, onDragStart, onDropOnTask }: TaskProps) {
  const [dropIndicator, setDropIndicator] = useState<'above' | 'below' | null>(null);

  const labels = task.labels || [];
  const catalogMap = Object.fromEntries(labelCatalog.map(l => [l.name, l.color]));
  const getLabelColor = (name: string) => catalogMap[name] ?? hashColor(name);
  const prio = task.priority ? PRIORITY_LABEL[task.priority] : null;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

  // Mix label color with alpha for bg, use full color for text (like GitHub)
  const makeLabelStyle = (color: string) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return {
      backgroundColor: `rgba(${r},${g},${b},0.18)`,
      color: luminance > 0.5 ? `rgb(${Math.round(r*0.7)},${Math.round(g*0.7)},${Math.round(b*0.7)})` : color,
      border: `1px solid rgba(${r},${g},${b},0.4)`,
    };
  };

  return (
    <div className="relative"
      onDragOver={e => {
        e.stopPropagation(); e.preventDefault();
        const r = e.currentTarget.getBoundingClientRect();
        setDropIndicator(e.clientY < r.top + r.height / 2 ? 'above' : 'below');
      }}
      onDragLeave={e => {
        if (!e.relatedTarget || !e.currentTarget.contains(e.relatedTarget as Node)) setDropIndicator(null);
      }}
      onDrop={e => {
        e.stopPropagation(); e.preventDefault();
        onDropOnTask(task.id, dropIndicator === 'above');
        setDropIndicator(null);
      }}
    >
      {dropIndicator === 'above' && (
        <div className="absolute -top-px left-0 right-0 h-0.5 z-10 pointer-events-none"
          style={{ background: 'var(--gh-accent-fg)' }} />
      )}

      <div
        draggable
        onDragStart={e => { e.dataTransfer.setData('dragType', 'task'); e.stopPropagation(); onDragStart(task); }}
        onClick={() => onEdit(task)}
        className="group cursor-pointer"
        style={{
          background: 'var(--gh-canvas-default)',
          border: '1px solid var(--gh-border-default)',
          borderRadius: '6px',
          padding: '12px',
          transition: 'border-color 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gh-accent-fg)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--gh-border-default)')}
      >
        {/* Title row */}
        <div className="flex items-start gap-2">
          <IssueIcon color={prio?.color ?? 'var(--gh-success-fg)'} />
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-tight group-hover:text-blue-400 transition"
              style={{ color: 'var(--gh-text-primary)', fontSize: '14px', lineHeight: '1.4' }}>
              {task.title}
            </p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onDelete(task.id); }}
            className="opacity-0 group-hover:opacity-100 transition flex-shrink-0"
            style={{ background: 'none', border: 'none', color: 'var(--gh-text-muted)', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gh-danger-fg)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--gh-text-muted)')}>×</button>
        </div>

        {/* Description */}
        {task.description && (
          <p className="mt-1.5 line-clamp-2" style={{ fontSize: '12px', color: 'var(--gh-text-secondary)', lineHeight: '1.5', paddingLeft: '24px' }}>
            {task.description}
          </p>
        )}

        {/* Labels */}
        {(labels.length > 0 || prio) && (
          <div className="flex flex-wrap gap-1 mt-2" style={{ paddingLeft: '24px' }}>
            {prio && (
              <span className="gh-label" style={{ backgroundColor: prio.bg, color: prio.color, borderColor: prio.border }}>
                {prio.text}
              </span>
            )}
            {labels.map(label => (
              <span key={label} className="gh-label" style={makeLabelStyle(getLabelColor(label))}>
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        {(task.due_date || task.assignee) && (
          <div className="flex items-center justify-between mt-2" style={{ paddingLeft: '24px' }}>
            {task.due_date ? (
              <span style={{ fontSize: '12px', color: isOverdue ? 'var(--gh-danger-fg)' : 'var(--gh-text-muted)' }}>
                {isOverdue ? '⚠ ' : ''}{formatDate(task.due_date)}
              </span>
            ) : <span />}

            {task.assignee && (
              <div className="flex items-center gap-1.5">
                {task.assignee.avatar_data ? (
                  <img src={task.assignee.avatar_data} alt={task.assignee.name} className="w-5 h-5 rounded-full object-cover" />
                ) : task.assignee.avatar_url ? (
                  <img src={task.assignee.avatar_url} alt={task.assignee.name} className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ background: 'var(--gh-accent-emphasis)', fontSize: '8px' }}>
                    {task.assignee.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontSize: '12px', color: 'var(--gh-text-muted)' }}>
                  {task.assignee.name.split(' ')[0]}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {dropIndicator === 'below' && (
        <div className="absolute -bottom-px left-0 right-0 h-0.5 z-10 pointer-events-none"
          style={{ background: 'var(--gh-accent-fg)' }} />
      )}
    </div>
  );
}
