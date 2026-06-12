import React, { useState, useEffect, useRef } from 'react';

interface User { id: string; name: string; email: string; avatar_url?: string; avatar_data?: string; created_at: string; }
interface Label { id: string; name: string; color: string; }
interface TaskType {
  id: string; title: string; description: string | null;
  column_id: string; assignee_id: string | null; position: number;
  due_date?: string | null; priority?: string | null; labels?: string[];
  created_at: string; updated_at: string; assignee: User | null;
}

interface TaskModalProps {
  task: TaskType | null; users: User[]; labelCatalog: Label[];
  onSave: (id: string, updates: Partial<TaskType>) => Promise<void>;
  onClose: () => void;
}

const PRIORITIES = [
  { value: 'urgent', label: 'Urgente', color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: 'rgba(248,81,73,0.35)' },
  { value: 'high',   label: 'Haute',   color: '#d29922', bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.35)' },
  { value: 'medium', label: 'Moyenne', color: '#58a6ff', bg: 'rgba(88,166,255,0.12)', border: 'rgba(88,166,255,0.35)' },
  { value: 'low',    label: 'Basse',   color: '#6e7681', bg: 'rgba(110,118,129,0.12)', border: 'rgba(110,118,129,0.3)' },
];

const LABEL_PALETTE = ['#8957e5','#db61a2','#0075ca','#0e8a16','#e4e669','#d73a4a','#f9d0c4','#e99695'];
const hashColor = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xff; return LABEL_PALETTE[h % LABEL_PALETTE.length]; };

const makeLabelStyle = (color: string) => {
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return {
    backgroundColor: `rgba(${r},${g},${b},0.18)`,
    color: lum > 0.5 ? `rgb(${Math.round(r * 0.65)},${Math.round(g * 0.65)},${Math.round(b * 0.65)})` : color,
    borderColor: `rgba(${r},${g},${b},0.4)`,
  };
};

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gh-text-secondary)', marginBottom: '6px' }}>{children}</label>
);

const Divider = () => <div style={{ height: '1px', background: 'var(--gh-border-muted)', margin: '16px 0' }} />;

export default function TaskModal({ task, users, labelCatalog, onSave, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.split('T')[0] : '');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const [priority, setPriority] = useState<string | null>(task?.priority ?? null);
  const [labels, setLabels] = useState<string[]>(task?.labels || []);
  const [labelInput, setLabelInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<{ title: string; description: string | null; dueDate: string; assigneeId: string; priority: string | null; labels: string[] } | null>(null);

  if (!task) return null;

  const autoSave = async (titleVal: string, descVal: string, dueDateVal: string, assigneeVal: string, priorityVal: string | null, labelsVal: string[]) => {
    const updates = {
      title: titleVal || task.title,
      description: descVal || null,
      due_date: dueDateVal ? new Date(dueDateVal).toISOString() : null,
      assignee_id: assigneeVal || null,
      priority: priorityVal,
      labels: labelsVal
    };

    try {
      setSaveStatus('saving');
      await onSave(task.id, updates);
      lastSavedRef.current = { title: titleVal, description: descVal, dueDate: dueDateVal, assigneeId: assigneeVal, priority: priorityVal, labels: labelsVal };
      setSaveStatus('saved');
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const scheduleAutoSave = (titleVal: string, descVal: string, dueDateVal: string, assigneeVal: string, priorityVal: string | null, labelsVal: string[]) => {
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autoSave(titleVal, descVal, dueDateVal, assigneeVal, priorityVal, labelsVal);
    }, 800);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    scheduleAutoSave(val, description, dueDate, assigneeId, priority, labels);
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    scheduleAutoSave(title, val, dueDate, assigneeId, priority, labels);
  };

  const handleDueDateChange = (val: string) => {
    setDueDate(val);
    scheduleAutoSave(title, description, val, assigneeId, priority, labels);
  };

  const handleAssigneeChange = (val: string) => {
    setAssigneeId(val);
    scheduleAutoSave(title, description, dueDate, val, priority, labels);
  };

  const handlePriorityChange = (val: string | null) => {
    setPriority(val);
    scheduleAutoSave(title, description, dueDate, assigneeId, val, labels);
  };

  const handleLabelsChange = (newLabels: string[]) => {
    setLabels(newLabels);
    scheduleAutoSave(title, description, dueDate, assigneeId, priority, newLabels);
  };

  const getCatalogColor = (name: string) => labelCatalog.find(l => l.name === name)?.color ?? hashColor(name);
  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const assignee = users.find(u => u.id === assigneeId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(1,4,9,0.7)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto',
        background: 'var(--gh-canvas-subtle)',
        border: '1px solid var(--gh-border-default)',
        borderRadius: '6px',
        boxShadow: '0 8px 24px rgba(1,4,9,0.7)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid var(--gh-border-default)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gh-text-primary)' }}>Modifier la tâche</span>
            <span style={{ fontSize: '12px', color: saveStatus === 'saved' ? 'var(--gh-success-fg)' : saveStatus === 'saving' ? 'var(--gh-text-muted)' : 'var(--gh-text-muted)' }}>
              {saveStatus === 'saved' ? '✓ Enregistré' : saveStatus === 'saving' ? '⟳ Enregistrement…' : '• Non enregistré'}
            </span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gh-text-muted)', fontSize: '18px', cursor: 'pointer', lineHeight: 1, padding: '2px' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gh-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--gh-text-muted)')}>×</button>
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <FieldLabel>Titre</FieldLabel>
            <input value={title} onChange={e => handleTitleChange(e.target.value)} className="gh-input" style={{ fontSize: '14px' }} placeholder="Titre de la tâche" />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <textarea value={description} onChange={e => handleDescriptionChange(e.target.value)}
              className="gh-input" style={{ height: '80px', lineHeight: '1.5' }} placeholder="Description optionnelle" />
          </div>

          <Divider />

          {/* Priority */}
          <div>
            <FieldLabel>Priorité</FieldLabel>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button onClick={() => handlePriorityChange(null)} className="gh-btn gh-btn-sm"
                style={{ borderColor: priority === null ? 'var(--gh-accent-fg)' : 'var(--gh-border-default)', color: priority === null ? 'var(--gh-accent-fg)' : 'var(--gh-text-primary)' }}>
                Aucune
              </button>
              {PRIORITIES.map(p => (
                <button key={p.value} onClick={() => handlePriorityChange(priority === p.value ? null : p.value)}
                  className="gh-btn gh-btn-sm"
                  style={{
                    background: priority === p.value ? p.bg : 'var(--gh-btn-bg)',
                    borderColor: priority === p.value ? p.border : 'var(--gh-border-default)',
                    color: priority === p.value ? p.color : 'var(--gh-text-primary)',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Labels */}
          <div>
            <FieldLabel>Labels</FieldLabel>
            {/* Catalog */}
            {labelCatalog.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {labelCatalog.map(l => {
                  const active = labels.includes(l.name);
                  const ls = makeLabelStyle(l.color);
                  return (
                    <button key={l.id} onClick={() => {
                      const newLabels = active ? labels.filter(x => x !== l.name) : [...labels, l.name];
                      handleLabelsChange(newLabels);
                    }}
                      className="gh-label"
                      style={{
                        ...ls, cursor: 'pointer',
                        opacity: active ? 1 : 0.45,
                        outline: active ? `2px solid ${l.color}60` : 'none',
                        outlineOffset: '1px',
                        transition: 'opacity 0.12s',
                        border: `1px solid ${ls.borderColor}`,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = active ? '1' : '0.45')}>
                      {l.name}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Custom labels */}
            {labels.filter(l => !labelCatalog.find(c => c.name === l)).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {labels.filter(l => !labelCatalog.find(c => c.name === l)).map(label => {
                  const ls = makeLabelStyle(getCatalogColor(label));
                  return (
                    <span key={label} className="gh-label" style={{ ...ls, cursor: 'default', border: `1px solid ${ls.borderColor}` }}>
                      {label}
                      <button onClick={() => {
                        const newLabels = labels.filter(l => l !== label);
                        handleLabelsChange(newLabels);
                      }}
                        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginLeft: '4px', opacity: 0.7, lineHeight: 1 }}>×</button>
                    </span>
                  );
                })}
              </div>
            )}
            <div style={{ display: 'flex', gap: '6px' }}>
              <input value={labelInput} onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const t = labelInput.trim().toLowerCase(); if (t && !labels.includes(t)) { handleLabelsChange([...labels, t]); setLabelInput(''); } } }}
                className="gh-input" placeholder="Ajouter un label..." style={{ flex: 1 }} />
              <button onClick={() => { const t = labelInput.trim().toLowerCase(); if (t && !labels.includes(t)) { handleLabelsChange([...labels, t]); setLabelInput(''); } }} className="gh-btn gh-btn-sm">+</button>
            </div>
          </div>

          <Divider />

          {/* Deadline + Assignee */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <FieldLabel>Échéance</FieldLabel>
              <input type="date" value={dueDate} onChange={e => handleDueDateChange(e.target.value)} className="gh-input" />
              {dueDate && (
                <p style={{ fontSize: '12px', color: isOverdue ? 'var(--gh-danger-fg)' : 'var(--gh-text-muted)', marginTop: '4px' }}>
                  {new Date(dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}{isOverdue && ' — En retard'}
                </p>
              )}
            </div>
            <div>
              <FieldLabel>Assigné à</FieldLabel>
              <select value={assigneeId} onChange={e => handleAssigneeChange(e.target.value)} className="gh-input">
                <option value="">Non assigné</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          </div>

          {assignee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--gh-canvas-default)', border: '1px solid var(--gh-border-muted)', borderRadius: '6px' }}>
              {assignee.avatar_data ? <img src={assignee.avatar_data} alt={assignee.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                : assignee.avatar_url ? <img src={assignee.avatar_url} alt={assignee.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gh-accent-emphasis)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '12px' }}>{assignee.name.charAt(0).toUpperCase()}</div>
              }
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--gh-text-primary)' }}>{assignee.name}</p>
                <p style={{ fontSize: '12px', color: 'var(--gh-text-muted)' }}>{assignee.email}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', background: 'var(--gh-canvas-inset)', borderRadius: '6px', border: '1px solid var(--gh-border-muted)' }}>
            {[['Créée', task.created_at], ['Modifiée', task.updated_at]].map(([l, d]) => (
              <div key={l}>
                <p style={{ fontSize: '11px', color: 'var(--gh-text-muted)', marginBottom: '2px' }}>{l}</p>
                <p style={{ fontSize: '12px', color: 'var(--gh-text-secondary)' }}>{new Date(d).toLocaleDateString('fr-FR')}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '8px', paddingTop: '4px' }}>
            <button onClick={onClose} className="gh-btn gh-btn-primary" style={{ flex: 1 }}>Fermer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
