import React, { useState } from 'react';
import { apiFetch } from '../lib/api';

interface Label { id: string; name: string; color: string; }
interface LabelPanelProps {
  labels: Label[];
  onAddLabel: (l: Label) => void; onUpdateLabel: (l: Label) => void; onDeleteLabel: (id: string) => void;
}

const PRESET_COLORS = ['#8957e5','#db61a2','#0075ca','#0e8a16','#fbca04','#d73a4a','#e4e669','#0052cc','#f9d0c4','#c2e0c6','#5319e7','#006b75'];

export default function LabelPanel({ labels, onAddLabel, onUpdateLabel, onDeleteLabel }: LabelPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#0075ca');
  const [submitting, setSubmitting] = useState(false);

  const makeLabelStyle = (color: string) => {
    const r = parseInt(color.slice(1,3),16); const g = parseInt(color.slice(3,5),16); const b = parseInt(color.slice(5,7),16);
    const lum = (0.299*r + 0.587*g + 0.114*b)/255;
    return { backgroundColor: `rgba(${r},${g},${b},0.18)`, color: lum > 0.5 ? `rgb(${Math.round(r*0.65)},${Math.round(g*0.65)},${Math.round(b*0.65)})` : color, borderColor: `rgba(${r},${g},${b},0.4)` };
  };

  const ColorPicker = ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
      {PRESET_COLORS.map(c => (
        <button key={c} type="button" onClick={() => onChange(c)}
          style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, cursor: 'pointer', border: value === c ? '2px solid white' : '2px solid transparent', transition: 'transform 0.1s', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.25)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
      ))}
      <input type="color" value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '18px', height: '18px', cursor: 'pointer', border: 'none', padding: 0, borderRadius: '50%', background: 'none' }} />
    </div>
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/v1/labels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName.trim().toLowerCase(), color: newColor }) });
      if (!res.ok) return;
      onAddLabel(await res.json());
      setNewName(''); setNewColor('#0075ca'); setShowAddForm(false);
    } finally { setSubmitting(false); }
  };

  const saveEdit = async (id: string) => {
    const res = await apiFetch(`/api/v1/labels/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName.trim().toLowerCase(), color: editColor }) });
    if (res.ok) onUpdateLabel(await res.json());
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    const res = await apiFetch(`/api/v1/labels/${id}`, { method: 'DELETE' });
    if (res.ok) onDeleteLabel(id);
    setDeletingId(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {labels.map(label => {
          const ls = makeLabelStyle(label.color);
          return (
            <div key={label.id}>
              {editingId === label.id ? (
                <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--gh-canvas-default)', border: '1px solid var(--gh-border-default)', marginBottom: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveEdit(label.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="gh-input" placeholder="Nom du label" />
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => saveEdit(label.id)} className="gh-btn gh-btn-primary gh-btn-sm" style={{ flex: 1 }}>Sauver</button>
                    <button onClick={() => setEditingId(null)} className="gh-btn gh-btn-sm" style={{ flex: 1 }}>Annuler</button>
                  </div>
                </div>
              ) : deletingId === label.id ? (
                <div style={{ padding: '12px', borderRadius: '6px', background: 'var(--gh-canvas-default)', border: '1px solid var(--gh-border-default)', marginBottom: '4px' }}>
                  <p style={{ fontSize: '13px', marginBottom: '8px', color: 'var(--gh-text-primary)' }}>
                    Supprimer <span style={{ ...ls, padding: '0 7px', borderRadius: '2em', fontSize: '12px', fontWeight: 500, border: `1px solid ${ls.borderColor}` }}>{label.name}</span> ?
                  </p>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => handleDelete(label.id)} className="gh-btn gh-btn-sm gh-btn-danger" style={{ flex: 1 }}>Supprimer</button>
                    <button onClick={() => setDeletingId(null)} className="gh-btn gh-btn-sm" style={{ flex: 1 }}>Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="group/label"
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '6px', transition: 'background 0.1s', cursor: 'default' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(177,186,196,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                  <span className="gh-label" style={{ ...ls, border: `1px solid ${ls.borderColor}` }}>{label.name}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ width: '100%', height: '8px', borderRadius: '4px', background: label.color + '40', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '100%', background: `linear-gradient(90deg, ${label.color} 0%, ${label.color}00 100%)`, borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div className="opacity-0 group-hover/label:opacity-100 transition flex-shrink-0" style={{ display: 'flex', gap: '2px' }}>
                    <button onClick={() => { setEditingId(label.id); setEditName(label.name); setEditColor(label.color); setDeletingId(null); }}
                      className="gh-btn gh-btn-sm" style={{ padding: '2px 6px', fontSize: '12px' }}>✎</button>
                    <button onClick={() => { setDeletingId(label.id); setEditingId(null); }}
                      className="gh-btn gh-btn-sm" style={{ padding: '2px 6px', fontSize: '14px', lineHeight: 1 }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--gh-danger-fg)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--gh-text-primary)')}>×</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {showAddForm ? (
          <form onSubmit={handleAdd} style={{ padding: '12px', borderRadius: '6px', background: 'var(--gh-canvas-default)', border: '1px solid var(--gh-border-default)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gh-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nouveau label</p>
            <input type="text" placeholder="Nom du label" value={newName} onChange={e => setNewName(e.target.value)}
              className="gh-input" autoFocus disabled={submitting} />
            <ColorPicker value={newColor} onChange={setNewColor} />
            {/* Preview */}
            {newName && (
              <span className="gh-label" style={{ ...makeLabelStyle(newColor), border: `1px solid ${makeLabelStyle(newColor).borderColor}`, alignSelf: 'flex-start' }}>{newName}</span>
            )}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="submit" disabled={submitting} className="gh-btn gh-btn-primary gh-btn-sm" style={{ flex: 1 }}>{submitting ? '…' : 'Créer le label'}</button>
              <button type="button" onClick={() => { setShowAddForm(false); setNewName(''); setNewColor('#0075ca'); }}
                className="gh-btn gh-btn-sm" style={{ flex: 1 }}>Annuler</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowAddForm(true)}
            style={{ width: '100%', marginTop: '8px', padding: '6px', background: 'none', border: '1px dashed var(--gh-border-default)', borderRadius: '6px', color: 'var(--gh-text-muted)', fontSize: '12px', cursor: 'pointer', transition: 'border-color 0.12s, color 0.12s' }}
            onMouseEnter={e => { (e.currentTarget.style.borderColor = 'var(--gh-text-secondary)'); (e.currentTarget.style.color = 'var(--gh-text-secondary)'); }}
            onMouseLeave={e => { (e.currentTarget.style.borderColor = 'var(--gh-border-default)'); (e.currentTarget.style.color = 'var(--gh-text-muted)'); }}>
            + Créer un label
          </button>
        )}
      </div>
    </div>
  );
}
