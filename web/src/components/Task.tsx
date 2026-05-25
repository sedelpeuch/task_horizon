import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
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

interface TaskProps {
  task: TaskType;
  users: User[];
  onDelete: (taskId: string) => void;
  onDragStart: (task: TaskType) => void;
}

export default function Task({ task, users, onDelete, onDragStart }: TaskProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(task)}
      className="bg-slate-600 rounded p-3 cursor-move hover:bg-slate-500 transition border-l-4 border-blue-500"
    >
      <h3 className="text-white font-medium text-sm truncate">{task.title}</h3>
      {task.description && <p className="text-slate-300 text-xs mt-1 line-clamp-2">{task.description}</p>}

      <div className="mt-2 flex items-center justify-between">
        {task.assignee ? (
          <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">{task.assignee.name}</span>
        ) : (
          <span className="text-xs text-slate-400">Unassigned</span>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="text-xs text-red-400 hover:text-red-300 transition"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
