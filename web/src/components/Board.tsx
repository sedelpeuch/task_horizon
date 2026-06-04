import React, { useEffect, useState } from 'react';
import Column from './Column';
import TaskModal from './TaskModal';

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
    const res = await fetch(`${API_URL}/tasks`);
    if (res.ok) setTasks(await res.json());
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [columnsRes, tasksRes] = await Promise.all([
          fetch(`${API_URL}/columns`),
          fetch(`${API_URL}/tasks`),
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
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, column_id: columnId, assignee_id: assigneeId }),
    });
    if (!res.ok) return;
    const newTask = await res.json();
    setTasks((prev) => [...prev, newTask]);
  };

  const deleteTask = async (taskId: string) => {
    const res = await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const res = await fetch(`${API_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Failed to update task');
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
  };

  const moveTask = async (taskId: string, targetColumnId: string, targetPosition: number) => {
    const res = await fetch(`${API_URL}/tasks/${taskId}/move`, {
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
    const res = await fetch(`${API_URL}/columns`, {
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
    const res = await fetch(`${API_URL}/columns/${columnId}`, { method: 'DELETE' });
    if (!res.ok) return;
    setColumns((prev) => prev.filter((c) => c.id !== columnId));
    setTasks((prev) => prev.filter((t) => t.column_id !== columnId));
  };

  const updateColumnColor = async (columnId: string, color: string) => {
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, color } : c)));
    await fetch(`${API_URL}/columns/${columnId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ color }),
    });
  };

  const renameColumn = async (columnId: string, name: string) => {
    const prevName = columns.find((c) => c.id === columnId)?.name;
    setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, name } : c)));
    const res = await fetch(`${API_URL}/columns/${columnId}`, {
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

    await fetch(`${API_URL}/columns/${col.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: swapCol.position }),
    });
    await fetch(`${API_URL}/columns/${swapCol.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: col.position }),
    });
  };

  if (loading) return <div className="p-4 text-slate-400">Chargement du tableau...</div>;
  if (error) return <div className="p-4 text-red-400">Erreur : {error}</div>;

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

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-5">
        {/* Filter dropdown */}
        <div className="relative">
          {showFilterMenu && <div className="fixed inset-0 z-10" onClick={() => setShowFilterMenu(false)} />}
          <button
            onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
              (filterUserId || filterPriority || filterLabel)
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 8h12M10 12h4" /></svg>
            Filtrer
            {(filterUserId || filterPriority || filterLabel) && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 absolute -top-0.5 -right-0.5" />
            )}
            <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {showFilterMenu && (
            <div className="absolute top-full mt-1.5 left-0 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl p-4 w-72 space-y-4">
              {/* Assigné */}
              {users.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assigné</p>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setFilterUserId(null)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${filterUserId === null ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      Tous
                    </button>
                    {users.map((user) => (
                      <button key={user.id} onClick={() => setFilterUserId(filterUserId === user.id ? null : user.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${filterUserId === user.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                        {user.avatar_data || user.avatar_url ? (
                          <img src={user.avatar_data || user.avatar_url} alt={user.name} className="w-3.5 h-3.5 rounded-full object-cover" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold" style={{ fontSize: '8px' }}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {user.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Priorité */}
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Priorité</p>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => setFilterPriority(null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${filterPriority === null ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    Toutes
                  </button>
                  {([
                    { value: 'urgent', label: 'Urgente', dot: 'bg-red-500' },
                    { value: 'high',   label: 'Haute',   dot: 'bg-orange-400' },
                    { value: 'medium', label: 'Moyenne', dot: 'bg-blue-400' },
                    { value: 'low',    label: 'Basse',   dot: 'bg-slate-400' },
                  ]).map((p) => (
                    <button key={p.value} onClick={() => setFilterPriority(filterPriority === p.value ? null : p.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition ${filterPriority === p.value ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Labels */}
              {allLabels.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Label</p>
                  <div className="flex flex-wrap gap-1.5">
                    {filterLabel && (
                      <button onClick={() => setFilterLabel(null)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-600 text-white transition">
                        Tous
                      </button>
                    )}
                    {allLabels.map((label) => {
                      const LABEL_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f97316', '#ef4444', '#f59e0b', '#3b82f6'];
                      const color = labelMap[label] ?? (() => { let h = 0; for (const c of label) h = (h * 31 + c.charCodeAt(0)) & 0xff; return LABEL_COLORS[h % LABEL_COLORS.length]; })();
                      return (
                        <button key={label} onClick={() => setFilterLabel(filterLabel === label ? null : label)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium text-white transition border-2 ${filterLabel === label ? 'border-white/50' : 'border-transparent opacity-60 hover:opacity-90'}`}
                          style={{ backgroundColor: color }}>
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(filterUserId || filterPriority || filterLabel) && (
                <button onClick={() => { setFilterUserId(null); setFilterPriority(null); setFilterLabel(null); }}
                  className="text-xs text-slate-500 hover:text-slate-300 transition underline w-full text-left">
                  Effacer les filtres
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          {showSortMenu && <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />}
          <button
            onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
              sortMode !== 'position'
                ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M7 12h10M11 18h2" /></svg>
            {sortMode === 'position' ? 'Trier' : { priority: 'Priorité', due_date: 'Échéance', title: 'Titre A–Z' }[sortMode]}
            <svg className="w-3 h-3 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>

          {showSortMenu && (
            <div className="absolute top-full mt-1.5 left-0 z-20 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1.5 w-44">
              {([
                { value: 'position', label: 'Manuel' },
                { value: 'priority', label: 'Priorité' },
                { value: 'due_date', label: 'Échéance' },
                { value: 'title',    label: 'Titre A–Z' },
              ] as const).map((s) => (
                <button key={s.value}
                  onClick={() => { setSortMode(s.value); setShowSortMenu(false); }}
                  className={`w-full text-left px-4 py-2 text-sm transition flex items-center gap-2 ${sortMode === s.value ? 'text-blue-300 bg-blue-600/10' : 'text-slate-300 hover:bg-slate-700'}`}>
                  {sortMode === s.value && <span className="text-blue-400">✓</span>}
                  {sortMode !== s.value && <span className="w-4" />}
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active indicator */}
        {(filterUserId || filterPriority || filterLabel || sortMode !== 'position') && (
          <>
            <span className="text-xs text-slate-500">{visibleTasks.length} tâche{visibleTasks.length !== 1 ? 's' : ''}</span>
            <button onClick={() => { setFilterUserId(null); setFilterPriority(null); setFilterLabel(null); setSortMode('position'); }}
              className="text-xs text-slate-500 hover:text-slate-300 transition underline">
              Réinitialiser
            </button>
          </>
        )}
      </div>

      {/* Columns */}
      <div className="flex flex-wrap gap-4 items-start">
        {sortedColumns.map((column, idx, arr) => (
          <div
            key={column.id}
            className="flex-shrink-0 w-72"
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
        <div className="flex-shrink-0 w-72">
          {showColumnForm ? (
            <div className="bg-slate-800 border border-slate-600 rounded-xl p-4 space-y-3">
              <input
                type="text"
                placeholder="Nom de la colonne..."
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addColumn();
                  if (e.key === 'Escape') setShowColumnForm(false);
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 text-slate-100 placeholder-slate-400 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <div>
                <p className="text-xs text-slate-400 mb-2">Couleur</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} onClick={() => setNewColumnColor(c)}
                      className="w-6 h-6 rounded-full border-2 transition hover:scale-110"
                      style={{ backgroundColor: c, borderColor: newColumnColor === c ? 'white' : 'transparent' }} />
                  ))}
                  <input type="color" value={newColumnColor}
                    onChange={(e) => setNewColumnColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer" title="Couleur personnalisée" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={addColumn}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition">
                  Ajouter
                </button>
                <button onClick={() => { setShowColumnForm(false); setNewColumnName(''); setNewColumnColor('#3b82f6'); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowColumnForm(true)}
              className="w-full h-16 border-2 border-dashed border-slate-700 hover:border-slate-500 text-slate-500 hover:text-slate-300 rounded-xl text-sm font-medium transition">
              + Nouvelle colonne
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
