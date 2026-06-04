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

interface TaskModalProps {
  task: TaskType | null;
  users: User[];
  labelCatalog: Label[];
  onSave: (taskId: string, updates: Partial<TaskType>) => Promise<void>;
  onClose: () => void;
}

const PRIORITIES = [
  { value: 'low',    label: 'Basse',   color: 'bg-slate-600',  text: 'text-slate-200' },
  { value: 'medium', label: 'Moyenne', color: 'bg-blue-600',   text: 'text-blue-100' },
  { value: 'high',   label: 'Haute',   color: 'bg-orange-500', text: 'text-orange-100' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-600',    text: 'text-red-100' },
];

const LABEL_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f97316', '#ef4444', '#f59e0b', '#3b82f6'];
const getLabelColor = (label: string) => {
  let hash = 0;
  for (const c of label) hash = (hash * 31 + c.charCodeAt(0)) & 0xff;
  return LABEL_COLORS[hash % LABEL_COLORS.length];
};

export default function TaskModal({ task, users, labelCatalog, onSave, onClose }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState(task?.due_date ? task.due_date.split('T')[0] : '');
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id || '');
  const [priority, setPriority] = useState<string | null>(task?.priority ?? null);
  const [labels, setLabels] = useState<string[]>(task?.labels || []);
  const [labelInput, setLabelInput] = useState('');
  const [saving, setSaving] = useState(false);

  if (!task) return null;

  const addLabel = () => {
    const trimmed = labelInput.trim().toLowerCase();
    if (trimmed && !labels.includes(trimmed)) setLabels([...labels, trimmed]);
    setLabelInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(task.id, {
        title: title || task.title,
        description: description || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignee_id: assigneeId || null,
        priority: priority,
        labels,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setSaving(false);
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  const assignee = users.find((u) => u.id === assigneeId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900/95 px-8 py-5 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-100">Modifier la tâche</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 text-2xl transition">✕</button>
        </div>

        <div className="p-8 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Titre</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-100 text-base border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              placeholder="Titre de la tâche" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-100 text-sm h-20 resize-none border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
              placeholder="Description optionnelle" />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Priorité</label>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setPriority(null)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${priority === null ? 'bg-slate-600 text-slate-100 border-slate-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'}`}>
                Aucune
              </button>
              {PRIORITIES.map((p) => (
                <button key={p.value}
                  onClick={() => setPriority(priority === p.value ? null : p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${priority === p.value ? `${p.color} ${p.text} border-transparent` : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Labels</label>
            {/* Catalog suggestions */}
            {labelCatalog.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {labelCatalog.map((l) => {
                  const active = labels.includes(l.name);
                  return (
                    <button key={l.id} type="button"
                      onClick={() => setLabels(active ? labels.filter((x) => x !== l.name) : [...labels, l.name])}
                      className={`px-2 py-0.5 rounded-full text-xs font-medium text-white transition border-2 ${active ? 'border-white/50' : 'border-transparent opacity-50 hover:opacity-80'}`}
                      style={{ backgroundColor: l.color }}>
                      {l.name}
                    </button>
                  );
                })}
              </div>
            )}
            {/* Active labels */}
            {labels.filter((l) => !labelCatalog.find((c) => c.name === l)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {labels.filter((l) => !labelCatalog.find((c) => c.name === l)).map((label) => (
                  <span key={label} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getLabelColor(label) }}>
                    {label}
                    <button onClick={() => setLabels(labels.filter((l) => l !== label))}
                      className="hover:text-white/70 transition leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
            {/* Free-form input */}
            <div className="flex gap-2">
              <input type="text" value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
                placeholder="Label personnalisé (Entrée pour ajouter)..."
                className="flex-1 px-3 py-2 rounded-lg bg-slate-700 text-slate-100 placeholder-slate-400 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none" />
              <button onClick={addLabel}
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition border border-slate-600">+</button>
            </div>
          </div>

          {/* Deadline + Assignee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Échéance</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-100 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition" />
              {dueDate && (
                <p className={`text-xs mt-1.5 ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                  {new Date(dueDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  {isOverdue && ' — En retard'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Assigné à</label>
              <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-700 text-slate-100 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition">
                <option value="">Non assigné</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignee preview */}
          {assignee && (
            <div className="bg-slate-700/50 rounded-lg p-3 flex items-center gap-3">
              {assignee.avatar_data ? (
                <img src={assignee.avatar_data} alt={assignee.name} className="w-10 h-10 rounded-full object-cover" />
              ) : assignee.avatar_url ? (
                <img src={assignee.avatar_url} alt={assignee.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-base font-bold">
                  {assignee.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-slate-100 text-sm">{assignee.name}</p>
                <p className="text-xs text-slate-400">{assignee.email}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-xs text-slate-400 bg-slate-800/50 rounded-lg p-3">
            <div><p className="text-slate-500 mb-0.5">Créée</p><p>{new Date(task.created_at).toLocaleDateString('fr-FR')}</p></div>
            <div><p className="text-slate-500 mb-0.5">Modifiée</p><p>{new Date(task.updated_at).toLocaleDateString('fr-FR')}</p></div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition">
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
            <button onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 py-3 rounded-lg font-semibold transition">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
