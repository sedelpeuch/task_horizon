import React, { useState } from 'react';
import Task from './Task';

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

interface TaskType {
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

interface ColumnProps {
  column: KanbanColumn;
  tasks: TaskType[];
  users: User[];
  labelCatalog: Label[];
  onAddTask: (columnId: string, title: string, description: string, assigneeId?: string | null) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: TaskType) => void;
  onDeleteColumn: (columnId: string) => void;
  onUpdateColor: (columnId: string, color: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onDropOnTask: (targetTaskId: string, above: boolean) => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onDragStart: (task: TaskType) => void;
}

const PRESET_COLORS = [
  '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6',
  '#ef4444', '#06b6d4', '#f97316', '#ec4899',
];

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

  const startEditingName = () => {
    setNameInput(column.name);
    setEditingName(true);
    setEditingColor(false);
    setConfirmingDelete(false);
  };

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed !== column.name) onRenameColumn(column.id, trimmed);
    setEditingName(false);
  };

  const color = column.color || '#3b82f6';
  const headerStyle = {
    background: `linear-gradient(to right, ${color}33, ${color}11)`,
    borderColor: `${color}44`,
  };

  return (
    <div className="bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl flex flex-col shadow-lg border border-slate-700 hover:border-slate-600 transition group/col">
      {/* Header */}
      <div className="px-4 py-3 rounded-t-xl border-b flex items-center justify-between min-h-[48px]" style={headerStyle}>
        {confirmingDelete ? (
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-slate-300 flex-1">Supprimer cette colonne ?</span>
            <button onClick={() => onDeleteColumn(column.id)}
              className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded font-medium transition">
              Supprimer
            </button>
            <button onClick={() => setConfirmingDelete(false)}
              className="px-2 py-0.5 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs rounded font-medium transition">
              Annuler
            </button>
          </div>
        ) : editingColor ? (
          <div className="flex items-center gap-1.5 w-full flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button key={c}
                onClick={() => { onUpdateColor(column.id, c); setEditingColor(false); }}
                className="w-5 h-5 rounded-full border-2 transition hover:scale-110"
                style={{ backgroundColor: c, borderColor: color === c ? 'white' : 'transparent' }}
              />
            ))}
            <input type="color" value={color}
              onChange={(e) => { onUpdateColor(column.id, e.target.value); setEditingColor(false); }}
              className="w-5 h-5 rounded cursor-pointer" title="Couleur personnalisée" />
            <button onClick={() => setEditingColor(false)} className="text-slate-400 hover:text-slate-200 text-xs ml-auto">✕</button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              {editingName ? (
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                  onBlur={saveName}
                  className="text-sm font-semibold text-slate-100 bg-transparent border-b border-blue-400 focus:outline-none min-w-0 flex-1 py-0"
                />
              ) : (
                <h2 className="text-sm font-semibold text-slate-100 truncate">{column.name}</h2>
              )}
              <span className="text-xs text-slate-400 flex-shrink-0">{tasks.length}</span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover/col:opacity-100 transition ml-2 flex-shrink-0">
              {onMoveLeft && (
                <button onClick={onMoveLeft} className="text-slate-500 hover:text-slate-200 text-sm px-1 transition" title="Déplacer à gauche">←</button>
              )}
              {onMoveRight && (
                <button onClick={onMoveRight} className="text-slate-500 hover:text-slate-200 text-sm px-1 transition" title="Déplacer à droite">→</button>
              )}
              <button onClick={startEditingName} className="text-slate-500 hover:text-blue-400 text-sm px-1 transition" title="Renommer">✎</button>
              <button onClick={() => setEditingColor(true)} className="text-slate-500 hover:text-slate-200 text-sm px-1 transition" title="Couleur">⬤</button>
              <button onClick={() => setConfirmingDelete(true)} className="text-slate-600 hover:text-red-400 text-lg leading-none transition" title="Supprimer">×</button>
            </div>
          </>
        )}
      </div>

      {/* Tasks */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-24">
        {tasks.map((task) => (
          <Task
            key={task.id}
            task={task}
            users={users}
            onDelete={onDeleteTask}
            onEdit={onEditTask}
            onDragStart={onDragStart}
            onDropOnTask={onDropOnTask}
            labelCatalog={labelCatalog}
          />
        ))}
      </div>

      {/* Add task */}
      <div className="p-3 border-t border-slate-700/50">
        {showForm ? (
          <form onSubmit={handleAddTask} className="bg-slate-700/50 rounded-lg p-3 space-y-2">
            <input type="text" placeholder="Titre de la tâche..."
              value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-600 text-slate-100 placeholder-slate-400 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus />
            <textarea placeholder="Description (optionnel)..."
              value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-600 text-slate-100 placeholder-slate-400 text-sm h-16 resize-none border border-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <select value={assigneeId || ''} onChange={(e) => setAssigneeId(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg bg-slate-600 text-slate-100 text-sm border border-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Non assigné</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition">
                Ajouter
              </button>
              <button type="button"
                onClick={() => { setShowForm(false); setTitle(''); setDescription(''); setAssigneeId(null); }}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium transition">
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)}
            className="w-full hover:bg-slate-700/50 text-slate-500 hover:text-slate-300 py-1.5 rounded-lg text-sm transition border border-transparent hover:border-slate-600">
            + Ajouter une tâche
          </button>
        )}
      </div>
    </div>
  );
}
