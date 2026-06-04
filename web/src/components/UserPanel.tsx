import React, { useState } from 'react';

interface User { id: string; name: string; email: string; avatar_url?: string; avatar_data?: string; created_at: string; }
interface UserPanelProps {
  users: User[]; onClose?: () => void;
  onAddUser: (u: User) => void; onUpdateUser: (u: User) => void; onDeleteUser: (id: string) => void;
}

function Avatar({ user, size = 32 }: { user: User; size?: number }) {
  const style = { width: size, height: size, borderRadius: '50%', objectFit: 'cover' as const, flexShrink: 0 };
  if (user.avatar_data) return <img src={user.avatar_data} alt={user.name} style={style} />;
  if (user.avatar_url) return <img src={user.avatar_url} alt={user.name} style={style} />;
  return (
    <div style={{ ...style, background: 'var(--gh-accent-emphasis)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: size * 0.38 }}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function UserPanel({ users, onAddUser, onUpdateUser, onDeleteUser }: UserPanelProps) {
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim(), email: newEmail.trim() }) });
      if (!res.ok) return;
      let user = await res.json();
      if (newAvatar) {
        const fd = new FormData(); fd.append('file', newAvatar);
        const ar = await fetch(`/api/v1/users/${user.id}/avatar`, { method: 'POST', body: fd });
        if (ar.ok) user = await ar.json();
      }
      onAddUser(user);
      setNewName(''); setNewEmail(''); setNewAvatar(null); setAvatarPreview(''); setShowAddForm(false);
    } finally { setSubmitting(false); }
  };

  const saveEdit = async (userId: string) => {
    const res = await fetch(`/api/v1/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName.trim(), email: editEmail.trim() }) });
    if (res.ok) onUpdateUser(await res.json());
    setEditingId(null);
  };

  const handleAvatarUpload = async (userId: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch(`/api/v1/users/${userId}/avatar`, { method: 'POST', body: fd });
    if (res.ok) onUpdateUser(await res.json());
  };

  const handleDelete = async (userId: string) => {
    const res = await fetch(`/api/v1/users/${userId}`, { method: 'DELETE' });
    if (res.ok) onDeleteUser(userId);
    setDeletingId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {users.map(user => (
          <div key={user.id}>
            {editingId === user.id ? (
              <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--gh-canvas-default)', border: '1px solid var(--gh-border-default)', marginBottom: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(user.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="gh-input" placeholder="Nom" />
                <input value={editEmail} onChange={e => setEditEmail(e.target.value)} type="email"
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(user.id); if (e.key === 'Escape') setEditingId(null); }}
                  className="gh-input" placeholder="Email" />
                <label style={{ fontSize: '12px', color: 'var(--gh-text-link)', cursor: 'pointer' }}>
                  Changer l'avatar
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { handleAvatarUpload(user.id, f); setEditingId(null); } }} />
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => saveEdit(user.id)} className="gh-btn gh-btn-primary gh-btn-sm" style={{ flex: 1 }}>Sauver</button>
                  <button onClick={() => setEditingId(null)} className="gh-btn gh-btn-sm" style={{ flex: 1 }}>Annuler</button>
                </div>
              </div>
            ) : deletingId === user.id ? (
              <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--gh-canvas-default)', border: '1px solid var(--gh-border-default)', marginBottom: '4px' }}>
                <p style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--gh-text-primary)' }}>
                  Supprimer <strong>{user.name}</strong> ?
                </p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleDelete(user.id)} className="gh-btn gh-btn-sm gh-btn-danger" style={{ flex: 1 }}>Supprimer</button>
                  <button onClick={() => setDeletingId(null)} className="gh-btn gh-btn-sm" style={{ flex: 1 }}>Annuler</button>
                </div>
              </div>
            ) : (
              <div className="group/user"
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '6px', transition: 'background 0.1s', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(177,186,196,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <Avatar user={user} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--gh-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</p>
                  <p style={{ fontSize: '11px', color: 'var(--gh-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                </div>
                <div className="opacity-0 group-hover/user:opacity-100 transition flex-shrink-0" style={{ display: 'flex', gap: '2px' }}>
                  <button onClick={() => { setEditingId(user.id); setEditName(user.name); setEditEmail(user.email); setDeletingId(null); }}
                    className="gh-btn gh-btn-sm" style={{ padding: '2px 6px', fontSize: '12px' }}>✎</button>
                  <button onClick={() => { setDeletingId(user.id); setEditingId(null); }}
                    className="gh-btn gh-btn-sm" style={{ padding: '2px 6px', fontSize: '14px', lineHeight: 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--gh-danger-fg)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--gh-text-primary)')}>×</button>
                </div>
              </div>
            )}
          </div>
        ))}

        {showAddForm ? (
          <form onSubmit={handleAdd} style={{ padding: '12px', borderRadius: '6px', background: 'var(--gh-canvas-default)', border: '1px solid var(--gh-border-default)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gh-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nouveau membre</p>
            <input type="text" placeholder="Nom" value={newName} onChange={e => setNewName(e.target.value)} className="gh-input" autoFocus disabled={submitting} />
            <input type="email" placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="gh-input" disabled={submitting} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {avatarPreview && <img src={avatarPreview} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />}
              <label style={{ fontSize: '12px', color: 'var(--gh-text-link)', cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {newAvatar ? newAvatar.name : 'Avatar (optionnel)'}
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={submitting}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setNewAvatar(f); const r = new FileReader(); r.onloadend = () => setAvatarPreview(r.result as string); r.readAsDataURL(f); } }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="submit" disabled={submitting} className="gh-btn gh-btn-primary gh-btn-sm" style={{ flex: 1 }}>{submitting ? '…' : 'Ajouter'}</button>
              <button type="button" onClick={() => { setShowAddForm(false); setNewName(''); setNewEmail(''); setNewAvatar(null); setAvatarPreview(''); }}
                className="gh-btn gh-btn-sm" style={{ flex: 1 }}>Annuler</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddForm(true)}
            style={{ width: '100%', marginTop: '8px', padding: '6px', background: 'none', border: '1px dashed var(--gh-border-default)', borderRadius: '6px', color: 'var(--gh-text-muted)', fontSize: '12px', cursor: 'pointer', transition: 'border-color 0.12s, color 0.12s' }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--gh-text-secondary)'); (e.currentTarget.style.color = 'var(--gh-text-secondary)'); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--gh-border-default)'); (e.currentTarget.style.color = 'var(--gh-text-muted)'); }}>
            + Ajouter un membre
          </button>
        )}
      </div>
    </div>
  );
}
