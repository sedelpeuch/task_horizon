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
  created_at: string;
  updated_at: string;
  assignee: User | null;
}

interface BoardProps {
  users: User[];
}

const PRESET_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
];

const API_URL = '/api/v1';

export default function Board({ users }: BoardProps) {
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
  const visibleTasks = filterUserId ? tasks.filter((t) => t.assignee_id === filterUserId) : tasks;

  return (
    <div className="w-full">
      {/* Filter bar */}
      {users.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs text-slate-500 mr-1">Filtrer :</span>
          <button
            onClick={() => setFilterUserId(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              filterUserId === null
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            Tous
          </button>
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => setFilterUserId(filterUserId === user.id ? null : user.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition ${
                filterUserId === user.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {user.avatar_data || user.avatar_url ? (
                <img src={user.avatar_data || user.avatar_url} alt={user.name} className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold" style={{ fontSize: '9px' }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              {user.name}
            </button>
          ))}
          {filterUserId && (
            <span className="text-xs text-slate-500 ml-1">
              {visibleTasks.length} tâche{visibleTasks.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

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
              tasks={visibleTasks
                .filter((t) => t.column_id === column.id)
                .sort((a, b) => a.position - b.position)}
              users={users}
              onAddTask={addTask}
              onDeleteTask={deleteTask}
              onEditTask={setSelectedTask}
              onDeleteColumn={deleteColumn}
              onUpdateColor={updateColumnColor}
              onRenameColumn={renameColumn}
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
        task={selectedTask}
        users={users}
        onSave={updateTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
}
