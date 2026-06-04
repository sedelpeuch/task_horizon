import React, { useState } from 'react';
import Task from './Task';

interface User { id: string; name: string; email: string; avatar_url?: string; avatar_data?: string; created_at: string; }
interface KanbanColumn { id: string; name: string; position: number; color?: string; }
interface TaskType {
  id: string; title: string; description: string | null;
  column_id: string; assignee_id: string | null; position: number;
  due_date?: string | null; priority?: string | null; labels?: string[];
  created_at: string; updated_at: string; assignee: User | null;
}
interface Label { id: string; name: string; color: string; }

interface ColumnProps {
  column: KanbanColumn; tasks: TaskType[]; users: User[]; labelCatalog: Label[];
  onAddTask: (colId: string, title: string, desc: string, assigneeId?: string | null) => void;
  onDeleteTask: (id: string) => void; onEditTask: (t: TaskType) => void;
  onDeleteColumn: (id: string) => void; onUpdateColor: (id: string, color: string) => void;
  onRenameColumn: (id: string, name: string) => void;
  onDropOnTask: (targetId: string, above: boolean) => void;
  onMoveLeft?: () => void; onMoveRight?: () => void;
  onDragStart: (t: TaskType) => void;
}

const PRESET_COLORS = ['#58a6ff','#3fb950','#f85149','#d29922','#8957e5','#db61a2','#79c0ff','#56d364','#ffa657','#ff7b72'];

export default function Column({
  column, tasks, users, labelCatalog,
  onAddTask, onDeleteTask, onEditTask, onDeleteColumn,
  onUpdateColor, onRenameColumn, onDropOnTask,
  onMoveLeft, onMoveRight, onDragStart,
}: ColumnProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editingColor, setEditingColor] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAddTask(column.id, title, description, assigneeId);
      setTitle(''); setDescription(''); setAssigneeId(null); setShowForm(false);
    }
  };

  const saveName = () => {
    const t = nameInput.trim();
    if (t && t !== column.name) onRenameColumn(column.id, t);
    setEditingName(false);
  };

  const color = column.color || '#58a6ff';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderRadius: '6px', overflow: 'hidden', background: 'var(--gh-canvas-subtle)', border: '1px solid var(--gh-border-default)' }}>

      {/* Column header */}
      <div className="group/col" style={{
        padding: '10px 12px',
        borderBottom: `1px solid var(--gh-border-default)`,
        display: 'flex', alignItems: 'center', gap: '8px', minHeight: '40px',
        borderTop: `3px solid ${color}`,
      }}>
        {confirmingDelete ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '12px', color: 'var(--gh-text-secondary)', flex: 1 }}>Supprimer ?</span>
            <button onClick={() => onDeleteColumn(column.id)} className="gh-btn gh-btn-sm gh-btn-danger"
              style={{ fontSize: '12px', padding: '2px 8px' }}>Oui</button>
            <button onClick={() => setConfirmingDelete(false)} className="gh-btn gh-btn-sm"
              style={{ fontSize: '12px', padding: '2px 8px' }}>Non</button>
          </div>
        ) : editingColor ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
            {PRESET_COLORS.map(c => (
              <button key={c} onClick={() => { onUpdateColor(column.id, c); setEditingColor(false); }}
                style={{ width: '16px', height: '16px', borderRadius: '50%', background: c, cursor: 'pointer', border: color === c ? '2px solid white' : '2px solid transparent', transition: 'transform 0.1s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
            ))}
            <input type="color" value={color} onChange={e => { onUpdateColor(column.id, e.target.value); setEditingColor(false); }}
              style={{ width: '16px', height: '16px', cursor: 'pointer', border: 'none', padding: 0 }} />
            <button onClick={() => setEditingColor(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--gh-text-muted)', cursor: 'pointer', fontSize: '14px' }}>×</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 }}>
              {editingName ? (
                <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  onBlur={saveName}
                  style={{ background: 'var(--gh-canvas-default)', border: '1px solid var(--gh-accent-fg)', borderRadius: '4px', color: 'var(--gh-text-primary)', fontSize: '12px', fontWeight: 600, padding: '2px 6px', outline: 'none', flex: 1, minWidth: 0, boxShadow: '0 0 0 3px rgba(31,111,235,0.4)' }} />
              ) : (
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gh-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {column.name}
                </span>
              )}
              <span style={{
                background: 'var(--gh-border-default)', color: 'var(--gh-text-secondary)',
                borderRadius: '2em', padding: '0 6px', fontSize: '11px', fontWeight: 600, flexShrink: 0,
              }}>{tasks.length}</span>
            </div>

            {/* Controls — show on hover */}
            <div className="opacity-0 group-hover/col:opacity-100 transition flex items-center gap-0.5 flex-shrink-0">
              {onMoveLeft && (
                <button onClick={onMoveLeft} className="gh-btn gh-btn-sm" style={{ padding: '2px 6px', fontSize: '12px' }}>←</button>
              )}
              {onMoveRight && (
                <button onClick={onMoveRight} className="gh-btn gh-btn-sm" style={{ padding: '2px 6px', fontSize: '12px' }}>→</button>
              )}
              <button onClick={() => { setNameInput(column.name); setEditingName(true); setEditingColor(false); setConfirmingDelete(false); }}
                className="gh-btn gh-btn-sm" style={{ padding: '2px 6px', fontSize: '12px' }}>✎</button>
              <button onClick={() => setEditingColor(true)}
                className="gh-btn gh-btn-sm" style={{ padding: '2px 6px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block' }} />
              </button>
              <button onClick={() => setConfirmingDelete(true)}
                className="gh-btn gh-btn-sm" style={{ padding: '2px 6px', fontSize: '14px', lineHeight: 1 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gh-danger-fg)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--gh-text-primary)'; }}>×</button>
            </div>
          </>
        )}
      </div>

      {/* Tasks */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '80px' }}
        onDragOver={e => e.preventDefault()}
      >
        {tasks.map(task => (
          <Task key={task.id} task={task} users={users} labelCatalog={labelCatalog}
            onDelete={onDeleteTask} onEdit={onEditTask}
            onDragStart={onDragStart} onDropOnTask={onDropOnTask} />
        ))}
      </div>

      {/* Add task */}
      <div style={{ padding: '8px', borderTop: '1px solid var(--gh-border-muted)' }}>
        {showForm ? (
          <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input type="text" placeholder="Titre de la tâche" value={title}
              onChange={e => setTitle(e.target.value)} className="gh-input" autoFocus />
            <textarea placeholder="Description (optionnel)" value={description}
              onChange={e => setDescription(e.target.value)} className="gh-input" style={{ height: '56px', resize: 'none' }} />
            <select value={assigneeId || ''} onChange={e => setAssigneeId(e.target.value || null)} className="gh-input">
              <option value="">Non assigné</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="submit" className="gh-btn gh-btn-primary gh-btn-sm" style={{ flex: 1 }}>Ajouter</button>
              <button type="button" onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setAssigneeId(null); }}
                className="gh-btn gh-btn-sm" style={{ flex: 1 }}>Annuler</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{
              width: '100%', padding: '4px 8px', fontSize: '12px', cursor: 'pointer',
              background: 'none', border: '1px dashed var(--gh-border-default)', borderRadius: '6px',
              color: 'var(--gh-text-muted)', transition: 'border-color 0.12s, color 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--gh-text-secondary)'); (e.currentTarget.style.color = 'var(--gh-text-secondary)'); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--gh-border-default)'); (e.currentTarget.style.color = 'var(--gh-text-muted)'); }}>
            + Ajouter un élément
          </button>
        )}
      </div>
    </div>
  );
}
