import React, { useState } from 'react';

interface Label {
  id: string;
  name: string;
  color: string;
}

interface LabelPanelProps {
  labels: Label[];
  onAddLabel: (label: Label) => void;
  onUpdateLabel: (label: Label) => void;
  onDeleteLabel: (labelId: string) => void;
}

const PRESET_COLORS = [
  '#8b5cf6', '#ec4899', '#06b6d4', '#10b981',
  '#f97316', '#ef4444', '#f59e0b', '#3b82f6',
  '#84cc16', '#a855f7', '#14b8a6', '#f43f5e',
];

export default function LabelPanel({ labels, onAddLabel, onUpdateLabel, onDeleteLabel }: LabelPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#8b5cf6');
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/labels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim().toLowerCase(), color: newColor }),
      });
      if (!res.ok) return;
      onAddLabel(await res.json());
      setNewName(''); setNewColor('#8b5cf6'); setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (label: Label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
    setDeletingId(null);
  };

  const saveEdit = async (labelId: string) => {
    const res = await fetch(`/api/v1/labels/${labelId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim().toLowerCase(), color: editColor }),
    });
    if (res.ok) onUpdateLabel(await res.json());
    setEditingId(null);
  };

  const handleDelete = async (labelId: string) => {
    const res = await fetch(`/api/v1/labels/${labelId}`, { method: 'DELETE' });
    if (res.ok) onDeleteLabel(labelId);
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Labels</h2>
          <p className="text-xs text-slate-400">{labels.length} label{labels.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-4 space-y-1.5">
        {labels.map((label) => (
          <div key={label.id} className="group/label">
            {editingId === label.id ? (
              <div className="bg-slate-700/80 border border-slate-600 rounded-xl p-3 space-y-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(label.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="w-full px-2 py-1.5 bg-slate-600 text-slate-100 rounded text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Nom du label"
                />
                <div>
                  <p className="text-xs text-slate-400 mb-1.5">Couleur</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button key={c} onClick={() => setEditColor(c)}
                        className="w-5 h-5 rounded-full border-2 transition hover:scale-110"
                        style={{ backgroundColor: c, borderColor: editColor === c ? 'white' : 'transparent' }} />
                    ))}
                    <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(label.id)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded transition font-medium">Sauver</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs py-1.5 rounded transition">Annuler</button>
                </div>
              </div>
            ) : deletingId === label.id ? (
              <div className="bg-slate-700/80 border border-red-700/40 rounded-xl p-3 space-y-2">
                <p className="text-sm text-slate-300">Supprimer <span className="font-semibold" style={{ color: label.color }}>{label.name}</span> ?</p>
                <p className="text-xs text-slate-400">Les tâches gardent ce label mais perdent sa couleur.</p>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(label.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded transition font-medium">Supprimer</button>
                  <button onClick={() => setDeletingId(null)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs py-1.5 rounded transition">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-700/40 transition border border-transparent hover:border-slate-700">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: label.color }} />
                <span className="flex-1 text-sm font-medium text-slate-100">{label.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover/label:opacity-100 transition flex-shrink-0">
                  <button onClick={() => startEdit(label)} className="text-slate-400 hover:text-blue-400 transition p-1" title="Modifier">✎</button>
                  <button onClick={() => { setDeletingId(label.id); setEditingId(null); }} className="text-slate-400 hover:text-red-400 text-lg leading-none transition p-1" title="Supprimer">×</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {showAddForm ? (
          <form onSubmit={handleAdd} className="bg-slate-700/50 border border-slate-600 rounded-xl p-3 space-y-2 mt-2">
            <p className="text-xs font-medium text-slate-300">Nouveau label</p>
            <input type="text" placeholder="Nom..." value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-600 text-slate-100 rounded text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
              autoFocus disabled={submitting} />
            <div>
              <p className="text-xs text-slate-400 mb-1.5">Couleur</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setNewColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition hover:scale-110"
                    style={{ backgroundColor: c, borderColor: newColor === c ? 'white' : 'transparent' }} />
                ))}
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer" />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs py-1.5 rounded transition font-medium">
                {submitting ? '...' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); setNewName(''); setNewColor('#8b5cf6'); }}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs py-1.5 rounded transition">
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddForm(true)}
            className="w-full mt-2 py-2.5 border border-dashed border-slate-600 hover:border-slate-500 text-slate-500 hover:text-slate-300 rounded-xl text-sm transition">
            + Ajouter un label
          </button>
        )}
      </div>
    </div>
  );
}
