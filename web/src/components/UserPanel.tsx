import React, { useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  avatar_data?: string;
  created_at: string;
}

interface UserPanelProps {
  users: User[];
  onClose: () => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

function UserAvatar({ user, size = 'w-10 h-10' }: { user: User; size?: string }) {
  if (user.avatar_data) return <img src={user.avatar_data} alt={user.name} className={`${size} rounded-full object-cover flex-shrink-0`} />;
  if (user.avatar_url) return <img src={user.avatar_url} alt={user.name} className={`${size} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${size} rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ fontSize: parseInt(size.match(/\d+/)?.[0] ?? '10') * 1.2 + 'px' }}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function UserPanel({ users, onClose, onAddUser, onUpdateUser, onDeleteUser }: UserPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAvatar, setNewAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() }),
      });
      if (!res.ok) return;
      let user = await res.json();
      if (newAvatar) {
        const fd = new FormData();
        fd.append('file', newAvatar);
        const ar = await fetch(`/api/v1/users/${user.id}/avatar`, { method: 'POST', body: fd });
        if (ar.ok) user = await ar.json();
      }
      onAddUser(user);
      setNewName(''); setNewEmail(''); setNewAvatar(null); setAvatarPreview(''); setShowAddForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setDeletingId(null);
  };

  const saveEdit = async (userId: string) => {
    const res = await fetch(`/api/v1/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() }),
    });
    if (res.ok) onUpdateUser(await res.json());
    setEditingId(null);
  };

  const handleAvatarUpload = async (userId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/v1/users/${userId}/avatar`, { method: 'POST', body: fd });
    if (res.ok) onUpdateUser(await res.json());
  };

  const handleDelete = async (userId: string) => {
    const res = await fetch(`/api/v1/users/${userId}`, { method: 'DELETE' });
    if (res.ok) onDeleteUser(userId);
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Équipe</h2>
          <p className="text-xs text-slate-400">{users.length} membre{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-xl leading-none transition p-1"
          title="Fermer">×</button>
      </div>

      {/* User list */}
      <div className="flex-1 overflow-y-auto py-3 px-4 space-y-2">
        {users.map((user) => (
          <div key={user.id} className="group/user">
            {editingId === user.id ? (
              <div className="bg-slate-700/80 border border-slate-600 rounded-xl p-3 space-y-2">
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(user.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="w-full px-2 py-1.5 bg-slate-600 text-slate-100 rounded text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Nom"
                />
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(user.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="w-full px-2 py-1.5 bg-slate-600 text-slate-100 rounded text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
                  placeholder="Email" type="email"
                />
                <label className="block cursor-pointer text-xs text-blue-400 hover:text-blue-300 transition">
                  Changer l'avatar
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { handleAvatarUpload(user.id, f); setEditingId(null); }
                  }} />
                </label>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(user.id)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded transition font-medium">Sauver</button>
                  <button onClick={() => setEditingId(null)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs py-1.5 rounded transition">Annuler</button>
                </div>
              </div>
            ) : deletingId === user.id ? (
              <div className="bg-slate-700/80 border border-red-700/40 rounded-xl p-3 space-y-2">
                <p className="text-sm text-slate-300">Supprimer <span className="font-semibold text-slate-100">{user.name}</span> ?</p>
                <p className="text-xs text-slate-400">Les tâches assignées seront désassignées.</p>
                <div className="flex gap-2">
                  <button onClick={() => handleDelete(user.id)} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 rounded transition font-medium">Supprimer</button>
                  <button onClick={() => setDeletingId(null)} className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs py-1.5 rounded transition">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-700/40 transition border border-transparent hover:border-slate-700">
                <UserAvatar user={user} size="w-10 h-10" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">{user.name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/user:opacity-100 transition flex-shrink-0">
                  <button onClick={() => startEdit(user)} className="text-slate-400 hover:text-blue-400 transition p-1" title="Modifier">✎</button>
                  <button onClick={() => { setDeletingId(user.id); setEditingId(null); }} className="text-slate-400 hover:text-red-400 text-lg leading-none transition p-1" title="Supprimer">×</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add user */}
        {showAddForm ? (
          <form onSubmit={handleAddUser} className="bg-slate-700/50 border border-slate-600 rounded-xl p-3 space-y-2 mt-2">
            <p className="text-xs font-medium text-slate-300">Nouveau membre</p>
            <input type="text" placeholder="Nom..." value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-600 text-slate-100 rounded text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
              autoFocus disabled={submitting} />
            <input type="email" placeholder="Email..." value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-600 text-slate-100 rounded text-sm border border-slate-500 focus:border-blue-500 focus:outline-none"
              disabled={submitting} />
            <div className="flex items-center gap-2">
              {avatarPreview && <img src={avatarPreview} alt="preview" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />}
              <label className="cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition truncate flex-1">
                {newAvatar ? newAvatar.name : 'Avatar (optionnel)'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setNewAvatar(f);
                    const reader = new FileReader();
                    reader.onloadend = () => setAvatarPreview(reader.result as string);
                    reader.readAsDataURL(f);
                  }
                }} disabled={submitting} />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs py-1.5 rounded transition font-medium">
                {submitting ? '...' : 'Ajouter'}
              </button>
              <button type="button" onClick={() => { setShowAddForm(false); setNewName(''); setNewEmail(''); setNewAvatar(null); setAvatarPreview(''); }}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-slate-200 text-xs py-1.5 rounded transition">
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddForm(true)}
            className="w-full mt-2 py-2.5 border border-dashed border-slate-600 hover:border-slate-500 text-slate-500 hover:text-slate-300 rounded-xl text-sm transition">
            + Ajouter un membre
          </button>
        )}
      </div>
    </div>
  );
}
