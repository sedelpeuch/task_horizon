import { useEffect, useState } from 'react';
import Column from './Column';
import TaskModal from './TaskModal';
import { apiFetch } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  avatar_data?: string;
  created_at: string;
}

interface KanbanColumn {
  id: string;
  name: string;
  position: number;
  color?: string;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  assignee_id: string | null;
  position: number;
  due_date?: string | null;
  priority?: string | null;
  labels?: string[];
  created_at: string;
  updated_at: string;
  assignee: User | null;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface BoardProps {
  users: User[];
  labels: Label[];
}

const PRESET_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
];

const API_URL = '/api/v1';

export default function Board({ users, labels }: BoardProps) {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showColumnForm, setShowColumnForm] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#3b82f6');
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'position' | 'priority' | 'due_date' | 'title'>('position');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const fetchTasks = async () => {
    const res = await apiFetch(`${API_URL}/tasks`);
    if (res.ok) setTasks(await res.json());
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [columnsRes, tasksRes] = await Promise.all([
          apiFetch(`${API_URL}/columns`),
          apiFetch(`${API_URL}/tasks`),
        ]);
        if (!columnsRes.ok || !tasksRes.ok) throw new Error('Failed to fetch data');
        setColumns(await columnsRes.json());
        setTasks(await tasksRes.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addTask = async (columnId: string, title: string, description = '', assigneeId: string | null = null) => {
    const res = await apiFetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, column_id: columnId, assignee_id: assigneeId }),
    });
    if (!res.ok) return;
    const newTask = await res.json();
    setTasks((prev) => [...prev, newTask]);
  };

  const deleteTask = async (taskId: string) => {
    const res = await apiFetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const res = await apiFetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  const moveTask = async (taskId: string, targetColumnId: string, targetPosition: number) => {
    const res = await apiFetch(`${API_URL}/tasks/${taskId}/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ column_id: targetColumnId, position: targetPosition }),
    });
    if (!res.ok) return;
    // Refetch to get correct positions for all shifted tasks
    await fetchTasks();
  };

  const handleDropOnTask = (targetTaskId: string, above: boolean) => {
    if (!draggedTask || draggedTask.id === targetTaskId) {
      setDraggedTask(null);
      return;
    }
    const targetTask = tasks.find((t) => t.id === targetTaskId);
    if (!targetTask) return;
    // Block within-column reorder when sort != position
    if (sortMode !== 'position' && draggedTask.column_id === targetTask.column_id) {
      setDraggedTask(null);
      return;
    }

    const columnTasks = tasks
      .filter((t) => t.column_id === targetTask.column_id)
      .sort((a, b) => a.position - b.position);

    const targetIdx = columnTasks.findIndex((t) => t.id === targetTaskId);
    let newPosition: number;
    if (above) {
      newPosition = targetTask.position;
    } else {
      const nextTask = columnTasks[targetIdx + 1];
      newPosition = nextTask ? nextTask.position : targetTask.position + 1;
    }

    moveTask(draggedTask.id, targetTask.column_id, newPosition);
    setDraggedTask(null);
  };

  const addColumn = async () => {
    if (!newColumnName.trim()) return;
    const res = await apiFetch(`${API_URL}/columns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newColumnName.trim(), color: newColumnColor }),
    });
    if (!res.ok) return;
    const newCol = await res.json();
    setColumns((prev) => [...prev, newCol]);
    setNewColumnName('');
    setNewColumnColor('#3b82f6');
    setShowColumnForm(false);
  };

  const deleteColumn = async (columnId: string) => {
    const res = await apiFetch(`${API_URL}/columns/${columnId}`, { method: 'DELETE' });
    if (!res.ok) return;
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setTasks((prev) => prev.filter((t) => t.column_id !== columnId));
  };

  const updateColumnColor = async (columnId: string, color: string) => {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, color } : c)));
    await apiFetch(`${API_URL}/columns/${columnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color }),
    });
  };

  const renameColumn = async (columnId: string, name: string) => {
    const prevName = columns.find((c) => c.id === columnId)?.name;
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name } : c)));
    const res = await apiFetch(`${API_URL}/columns/${columnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok && prevName) {
      setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name: prevName } : c)));
    }
  };

  const moveColumn = async (columnId: string, direction: 'left' | 'right') => {
    const sorted = [...columns].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((c) => c.id === columnId);
    const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const col = sorted[idx];
    const swapCol = sorted[swapIdx];

    setColumns((prev) =>
      prev
        .map((c) => {
          if (c.id === col.id) return { ...c, position: swapCol.position };
          if (c.id === swapCol.id) return { ...c, position: col.position };
          return c;
        })
        .sort((a, b) => a.position - b.position)
    );

    await apiFetch(`${API_URL}/columns/${col.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: swapCol.position }),
    });
    await apiFetch(`${API_URL}/columns/${swapCol.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: col.position }),
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span style={{ color: 'var(--gh-text-muted)', fontSize: '14px' }}>Chargement…</span>
    </div>
  );
  if (error) return (
    <div className="p-4" style={{ color: 'var(--gh-danger-fg)', fontSize: '14px' }}>Erreur : {error}</div>
  );

  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);
  const labelMap = Object.fromEntries(labels.map((l) => [l.name, l.color]));
  const allLabels = [...new Set(tasks.flatMap((t) => t.labels || []))].sort();

  const PRIORITY_ORDER: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
  const sortTasks = (arr: Task[]) => {
    if (sortMode === 'position') return [...arr].sort((a, b) => a.position - b.position);
    if (sortMode === 'priority') return [...arr].sort((a, b) => (PRIORITY_ORDER[b.priority ?? ''] ?? 0) - (PRIORITY_ORDER[a.priority ?? ''] ?? 0));
    if (sortMode === 'due_date') return [...arr].sort((a, b) => {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
    if (sortMode === 'title') return [...arr].sort((a, b) => a.title.localeCompare(b.title, 'fr'));
    return arr;
  };
  const visibleTasks = tasks.filter((t) => {
    if (filterUserId && t.assignee_id !== filterUserId) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterLabel && !(t.labels || []).includes(filterLabel)) return false;
    return true;
  });

  const filterActive = !!(filterUserId || filterPriority || filterLabel);
  const LABEL_PALETTE = ['#8957e5','#db61a2','#0075ca','#0e8a16','#e4e669','#d73a4a','#f9d0c4','#e99695'];
  const hashColor = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xff; return LABEL_PALETTE[h % LABEL_PALETTE.length]; };
  const getChipColor = (label: string) => labelMap[label] ?? hashColor(label);
  const makeLabelStyle = (color: string) => {
    const r = parseInt(color.slice(1, 3), 16); const g = parseInt(color.slice(3, 5), 16); const b = parseInt(color.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return { backgroundColor: `rgba(${r},${g},${b},0.18)`, color: lum > 0.5 ? `rgb(${Math.round(r*0.65)},${Math.round(g*0.65)},${Math.round(b*0.65)})` : color, borderColor: `rgba(${r},${g},${b},0.4)` };
  };

  const SORT_LABELS: Record<string, string> = { priority: 'Priorité', due_date: 'Échéance', title: 'Titre A–Z' };

  return (
    <div className="w-full">
      {/* GitHub-style toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>

        {/* Filter */}
        <div style={{ position: 'relative' }}>
          {showFilterMenu && <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />}
          <button onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
            className="gh-btn gh-btn-sm"
            style={{ borderColor: filterActive ? 'var(--gh-accent-fg)' : 'var(--gh-border-default)', color: filterActive ? 'var(--gh-accent-fg)' : 'var(--gh-text-primary)' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M.75 3h14.5a.75.75 0 010 1.5H.75A.75.75 0 010 3.75.75.75 0 01.75 3zm2 4.5h10.5a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5zm3.75 4.5h3a.75.75 0 010 1.5h-3a.75.75 0 010-1.5z" /></svg>
            Filtrer
            {filterActive && <span style={{ background: 'var(--gh-accent-emphasis)', color: 'white', borderRadius: '2em', padding: '0 5px', fontSize: '10px', fontWeight: 600 }}>{[filterUserId, filterPriority, filterLabel].filter(Boolean).length}</span>}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z" opacity=".5" /></svg>
          </button>

          {showFilterMenu && (
            <div className="gh-dropdown absolute z-20" style={{ top: 'calc(100% + 4px)', left: 0, padding: '8px 0', width: '280px' }}>
              {/* Assigné */}
              {users.length > 0 && (
                <div style={{ padding: '8px 16px 4px' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gh-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Assigné à</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {[{ id: null as null, name: 'Tous' }, ...users.map(u => ({ id: u.id, name: u.name, avatar: u.avatar_data || u.avatar_url }))].map(item => (
                      <button key={item.id ?? 'all'} onClick={() => setFilterUserId(item.id)}
                        className="gh-btn gh-btn-sm"
                        style={{ borderColor: filterUserId === item.id ? 'var(--gh-accent-fg)' : 'var(--gh-border-default)', color: filterUserId === item.id ? 'var(--gh-accent-fg)' : 'var(--gh-text-primary)' }}>
                        {(item as { avatar?: string }).avatar && (
                          <img src={(item as { avatar?: string }).avatar} alt="" style={{ width: 14, height: 14, borderRadius: '50%', objectFit: 'cover' }} />
                        )}
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ height: '1px', background: 'var(--gh-border-muted)', margin: '8px 0' }} />

              {/* Priorité */}
              <div style={{ padding: '4px 16px 8px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gh-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Priorité</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {[{ v: null, l: 'Toutes', c: 'var(--gh-text-primary)' },
                    { v: 'urgent', l: 'Urgente', c: '#f85149' },
                    { v: 'high',   l: 'Haute',   c: '#d29922' },
                    { v: 'medium', l: 'Moyenne', c: '#58a6ff' },
                    { v: 'low',    l: 'Basse',   c: '#6e7681' },
                  ].map(p => (
                    <button key={p.v ?? 'all'} onClick={() => setFilterPriority(p.v)}
                      className="gh-btn gh-btn-sm"
                      style={{ borderColor: filterPriority === p.v ? p.c : 'var(--gh-border-default)', color: filterPriority === p.v ? p.c : 'var(--gh-text-primary)' }}>
                      {p.v && <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.c, display: 'inline-block' }} />}
                      {p.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Labels */}
              {allLabels.length > 0 && (
                <>
                  <div style={{ height: '1px', background: 'var(--gh-border-muted)', margin: '0 0 8px' }} />
                  <div style={{ padding: '0 16px 8px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gh-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Labels</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {allLabels.map(label => {
                        const ls = makeLabelStyle(getChipColor(label));
                        const active = filterLabel === label;
                        return (
                          <button key={label} onClick={() => setFilterLabel(active ? null : label)}
                            className="gh-label"
                            style={{ ...ls, cursor: 'pointer', opacity: active ? 1 : 0.6, border: `1px solid ${ls.borderColor}`, outline: active ? `2px solid ${ls.color}50` : 'none', outlineOffset: '1px' }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = active ? '1' : '0.6')}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {filterActive && (
                <>
                  <div style={{ height: '1px', background: 'var(--gh-border-muted)' }} />
                  <button onClick={() => { setFilterUserId(null); setFilterPriority(null); setFilterLabel(null); }}
                    className="gh-dropdown-item" style={{ color: 'var(--gh-danger-fg)', fontSize: '12px' }}>
                    Effacer les filtres
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sort */}
        <div style={{ position: 'relative' }}>
          {showSortMenu && <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />}
          <button onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
            className="gh-btn gh-btn-sm"
            style={{ borderColor: sortMode !== 'position' ? 'var(--gh-accent-fg)' : 'var(--gh-border-default)', color: sortMode !== 'position' ? 'var(--gh-accent-fg)' : 'var(--gh-text-primary)' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 4.75a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 5a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5A.75.75 0 012 9.75zM2.75 13a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z"/></svg>
            {sortMode === 'position' ? 'Trier' : SORT_LABELS[sortMode]}
            <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor"><path d="M0 0l5 6 5-6z" opacity=".5" /></svg>
          </button>

          {showSortMenu && (
            <div className="gh-dropdown absolute z-20 py-2" style={{ top: 'calc(100% + 4px)', left: 0 }}>
              {([
                { value: 'position', label: 'Manuel' },
                { value: 'priority', label: 'Priorité' },
                { value: 'due_date', label: 'Échéance' },
                { value: 'title',    label: 'Titre A–Z' },
              ] as const).map(s => (
                <button key={s.value} onClick={() => { setSortMode(s.value); setShowSortMenu(false); }}
                  className={`gh-dropdown-item ${sortMode === s.value ? 'active' : ''}`}
                  style={{ fontSize: '13px' }}>
                  <span style={{ width: 16, textAlign: 'center', color: 'var(--gh-success-fg)' }}>{sortMode === s.value ? '✓' : ''}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {(filterActive || sortMode !== 'position') && (
          <>
            <span style={{ fontSize: '12px', color: 'var(--gh-text-muted)' }}>
              {visibleTasks.length} résultat{visibleTasks.length !== 1 ? 's' : ''}
            </span>
            <button onClick={() => { setFilterUserId(null); setFilterPriority(null); setFilterLabel(null); setSortMode('position'); }}
              style={{ background: 'none', border: 'none', fontSize: '12px', color: 'var(--gh-text-link)', cursor: 'pointer' }}>
              Réinitialiser
            </button>
          </>
        )}
      </div>

      {/* Columns */}
      <div className="flex flex-wrap gap-3 items-start">
        {sortedColumns.map((column, idx, arr) => (
          <div
            key={column.id}
            style={{ flexShrink: 0, width: '280px' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              if (e.dataTransfer.getData('dragType') === 'task' && draggedTask) {
                const tasksInCol = tasks.filter((t) => t.column_id === column.id);
                moveTask(draggedTask.id, column.id, tasksInCol.length);
                setDraggedTask(null);
              }
            }}
          >
            <Column
              column={column}
              tasks={sortTasks(visibleTasks.filter((t) => t.column_id === column.id))}
              users={users}
              onAddTask={addTask}
              onDeleteTask={deleteTask}
              onEditTask={setSelectedTask}
              onDeleteColumn={deleteColumn}
              onUpdateColor={updateColumnColor}
              onRenameColumn={renameColumn}
              labelCatalog={labels}
              onDropOnTask={handleDropOnTask}
              onMoveLeft={idx > 0 ? () => moveColumn(column.id, 'left') : undefined}
              onMoveRight={idx < arr.length - 1 ? () => moveColumn(column.id, 'right') : undefined}
              onDragStart={setDraggedTask}
            />
          </div>
        ))}

        {/* Add column */}
        <div style={{ flexShrink: 0, width: '280px' }}>
          {showColumnForm ? (
            <div style={{ background: 'var(--gh-canvas-subtle)', border: '1px solid var(--gh-border-default)', borderRadius: '6px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="text" placeholder="Nom de la colonne" value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addColumn(); if (e.key === 'Escape') setShowColumnForm(false); }}
                className="gh-input" autoFocus />
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--gh-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Couleur</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {PRESET_COLORS.map(c => (
                    <button key={c} onClick={() => setNewColumnColor(c)}
                      style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, cursor: 'pointer', border: newColumnColor === c ? '2px solid white' : '2px solid transparent', transition: 'transform 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.25)')}
                      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                  ))}
                  <input type="color" value={newColumnColor} onChange={e => setNewColumnColor(e.target.value)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', border: 'none', padding: 0, borderRadius: '50%' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={addColumn} className="gh-btn gh-btn-primary gh-btn-sm" style={{ flex: 1 }}>Ajouter</button>
                <button onClick={() => { setShowColumnForm(false); setNewColumnName(''); setNewColumnColor('#58a6ff'); }}
                  className="gh-btn gh-btn-sm" style={{ flex: 1 }}>Annuler</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowColumnForm(true)}
              style={{
                width: '100%', height: '80px', background: 'none', cursor: 'pointer',
                border: '1px dashed var(--gh-border-default)', borderRadius: '6px',
                color: 'var(--gh-text-muted)', fontSize: '13px', transition: 'border-color 0.12s, color 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--gh-text-secondary)'); (e.currentTarget.style.color = 'var(--gh-text-secondary)'); }}
              onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--gh-border-default)'); (e.currentTarget.style.color = 'var(--gh-text-muted)'); }}>
              + Ajouter une colonne
            </button>
          )}
        </div>
      </div>

      <TaskModal
        key={selectedTask?.id}
        task={selectedTask}
        users={users}
        labelCatalog={labels}
        onSave={updateTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
