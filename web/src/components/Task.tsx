import React from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  avatar_data?: string;
  created_at: string;
}

interface TaskType {
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

interface TaskProps {
  task: TaskType;
  users: User[];
  onDelete: (taskId: string) => void;
  onEdit: (task: TaskType) => void;
  onDragStart: (task: TaskType) => void;
}

export default function Task({ task, users, onDelete, onEdit, onDragStart }: TaskProps) {
  const formatDate = (date: string | undefined) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('dragType', 'task');
        e.stopPropagation();
        onDragStart(task);
      }}
      onClick={() => onEdit(task)}
      className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-lg p-4 cursor-grab active:cursor-grabbing hover:shadow-lg transition border border-slate-600 hover:border-slate-500 group hover:border-blue-500 hover:bg-gradient-to-br hover:from-slate-700 hover:to-slate-700"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-slate-100 font-semibold text-sm leading-tight flex-1 group-hover:text-blue-300 transition">{task.title}</h3>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-lg"
          title="Delete task"
        >
          ×
        </button>
      </div>

      {task.description && (
        <p className="text-slate-400 text-xs mb-2 line-clamp-2 leading-relaxed">{task.description}</p>
      )}

      {task.due_date && (
        <div className={`text-xs mb-2 px-2 py-1 rounded w-fit ${isOverdue ? 'bg-red-900/30 text-red-300' : 'bg-slate-600 text-slate-300'}`}>
          📅 {formatDate(task.due_date)}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
        {task.assignee ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {task.assignee.avatar_data ? (
              <img
                src={task.assignee.avatar_data}
                alt={task.assignee.name}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                title={task.assignee.name}
              />
            ) : task.assignee.avatar_url ? (
              <img
                src={task.assignee.avatar_url}
                alt={task.assignee.name}
                className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                title={task.assignee.name}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {task.assignee.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-slate-400 truncate">{task.assignee.name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-500 italic">Unassigned</span>
        )}
      </div>
    </div>
  );
}
