import React, { useState } from 'react';

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

interface TaskModalProps {
  task: TaskType | null;
  users: User[];
  onSave: (taskId: string, updates: Partial<TaskType>) => Promise<void>;
  onClose: () => void;
}

export default function TaskModal({ task, users, onSave, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.split('T')[0] : '');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const [saving, setSaving] = useState(false);

  if (!task) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(task.id, {
        title: title || task.title,
        description: description || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeId || null,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(task.title);
    setDescription(task.description || '');
    setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
    setAssigneeId(task.assignee_id || '');
    onClose();
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();
  const formatDate = (date: string | undefined) => {
    if (!date) return 'No deadline';
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900/95 px-8 py-6 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-100">Edit Task</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-2xl transition"
          >
            ✕
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-100 text-base border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              placeholder="Task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-100 text-base h-24 resize-none border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              placeholder="Task description (optional)"
            />
          </div>

          {/* Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Deadline</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-100 text-base border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              />
              {dueDate && (
                <p className={`text-sm mt-2 ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                  {formatDate(dueDate)} {isOverdue && '⚠️ Overdue'}
                </p>
              )}
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Assign to</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-100 text-base border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee Preview */}
          {assigneeId && users.find((u) => u.id === assigneeId) && (
            <div className="bg-slate-700/50 rounded-lg p-4 flex items-center gap-3">
              {(() => {
                const user = users.find((u) => u.id === assigneeId);
                if (!user) return null;
                return (
                  <>
                    {user.avatar_data ? (
                      <img
                        src={user.avatar_data}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-100">{user.name}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm text-slate-400 bg-slate-800/50 rounded-lg p-4">
            <div>
              <p className="text-slate-500">Created</p>
              <p>{new Date(task.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-slate-500">Last updated</p>
              <p>{new Date(task.updated_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition text-base"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-lg font-semibold transition text-base"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
