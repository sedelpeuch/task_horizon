import React, { useState } from 'react';
import Task from './Task';

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface KanbanColumn {
  id: string;
  name: string;
  position: number;
}

interface TaskType {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  assignee_id: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignee: User | null;
}

interface ColumnProps {
  column: KanbanColumn;
  tasks: TaskType[];
  users: User[];
  onAddTask: (columnId: string, title: string, description: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDragStart: (task: TaskType) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (columnId: string) => void;
}

export default function Column({
  column,
  tasks,
  users,
  onAddTask,
  onDeleteTask,
  onDragStart,
  onDragOver,
  onDrop,
}: ColumnProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onAddTask(column.id, title, description);
      setTitle('');
      setDescription('');
      setShowForm(false);
    }
  };

  return (
    <div
      className="bg-slate-700 rounded-lg p-4 min-h-96"
      onDragOver={onDragOver}
      onDrop={() => onDrop(column.id)}
    >
      <h2 className="text-lg font-semibold text-white mb-4">{column.name}</h2>

      <div className="space-y-3 mb-4">
        {tasks.map((task) => (
          <Task key={task.id} task={task} users={users} onDelete={onDeleteTask} onDragStart={onDragStart} />
        ))}
      </div>

      {showForm ? (
        <form onSubmit={handleAddTask} className="bg-slate-600 rounded p-3 space-y-2">
          <input
            type="text"
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-500 text-white placeholder-slate-300 text-sm"
            autoFocus
          />
          <textarea
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2 py-1 rounded bg-slate-500 text-white placeholder-slate-300 text-sm h-16 resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setTitle('');
                setDescription('');
              }}
              className="flex-1 bg-slate-500 hover:bg-slate-400 text-white px-2 py-1 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-slate-600 hover:bg-slate-500 text-slate-200 py-2 rounded text-sm font-medium transition"
        >
          + Add task
        </button>
      )}
    </div>
  );
}
