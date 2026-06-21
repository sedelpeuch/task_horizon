import { useEffect, useState } from 'react';
import Board from './components/Board';
import LabelPanel from './components/LabelPanel';
import LoginModal from './components/LoginModal';
import UserPanel from './components/UserPanel';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { apiFetch } from './lib/api';

interface User {
  id: string; name: string; email: string;
  avatar_url?: string; avatar_data?: string; created_at: string;
}
interface Label { id: string; name: string; color: string; }

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'labels'>('users');

  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      apiFetch('/api/v1/users').then(r => r.json()),
      apiFetch('/api/v1/labels').then(r => r.json()),
    ]).then(([u, l]) => { setUsers(u); setLabels(l); }).finally(() => setLoading(false));
  }, [isAuthenticated]);

  if (!isAuthenticated) return <LoginModal />;

  const openPanel = (tab: 'users' | 'labels') => { setActiveTab(tab); setShowPanel(true); };

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: 'var(--gh-canvas-default)' }}>
      <div style={{ color: 'var(--gh-text-muted)', fontSize: '14px' }}>Chargement…</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gh-canvas-default)' }}>

      {/* GitHub-style header */}
      <header style={{ background: 'var(--gh-canvas-subtle)', borderBottom: '1px solid var(--gh-border-default)', height: '48px', display: 'flex', alignItems: 'center' }}>
        <div className="max-w-screen-2xl mx-auto px-4 w-full flex items-center justify-between">

          {/* Left: logo + name */}
          <div className="flex items-center gap-2">
            {/* GitHub-ish octicon placeholder */}
            <svg height="32" viewBox="0 0 16 16" width="32" style={{ fill: 'var(--gh-text-primary)' }}>
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--gh-text-primary)' }}>TaskHorizon</span>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => openPanel('labels')} className="gh-btn gh-btn-sm"
              style={{ gap: '6px' }}>
              <div className="flex gap-1">
                {labels.slice(0, 3).map(l => (
                  <span key={l.id} className="w-3 h-3 rounded-full inline-block" style={{ background: l.color }} />
                ))}
              </div>
              Labels
              {labels.length > 0 && (
                <span style={{
                  background: 'var(--gh-border-default)', color: 'var(--gh-text-secondary)',
                  borderRadius: '2em', padding: '0 6px', fontSize: '11px', fontWeight: 600,
                }}>{labels.length}</span>
              )}
            </button>

            <button onClick={() => openPanel('users')} className="gh-btn gh-btn-sm">
              <div className="flex -space-x-1">
                {users.slice(0, 3).map(u => (
                  u.avatar_data || u.avatar_url
                    ? <img key={u.id} src={u.avatar_data || u.avatar_url} alt={u.name}
                        className="w-5 h-5 rounded-full object-cover" style={{ border: '1px solid var(--gh-canvas-subtle)' }} />
                    : <div key={u.id} className="w-5 h-5 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ background: 'var(--gh-accent-emphasis)', border: '1px solid var(--gh-canvas-subtle)', fontSize: '9px' }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                ))}
              </div>
              Équipe
              {users.length > 0 && (
                <span style={{
                  background: 'var(--gh-border-default)', color: 'var(--gh-text-secondary)',
                  borderRadius: '2em', padding: '0 6px', fontSize: '11px', fontWeight: 600,
                }}>{users.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-4">
        <Board users={users} labels={labels} />
      </main>

      {showPanel && (
        <div className="fixed inset-0 z-30" style={{ background: 'rgba(1,4,9,0.65)' }}
          onClick={() => setShowPanel(false)} />
      )}

      {/* Side panel */}
      <div className="fixed top-0 right-0 h-full z-40 flex flex-col"
        style={{
          width: '296px',
          background: 'var(--gh-canvas-subtle)',
          borderLeft: '1px solid var(--gh-border-default)',
          boxShadow: '-8px 0 24px rgba(1,4,9,0.4)',
          transform: showPanel ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.2s ease',
        }}>

        {/* Tab header */}
        <div className="flex items-center" style={{ borderBottom: '1px solid var(--gh-border-default)', height: '40px' }}>
          {(['users', 'labels'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex: 1, height: '100%', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                background: 'none', border: 'none',
                color: activeTab === tab ? 'var(--gh-text-primary)' : 'var(--gh-text-secondary)',
                borderBottom: activeTab === tab ? '2px solid var(--gh-accent-fg)' : '2px solid transparent',
                transition: 'color 0.1s, border-color 0.1s',
              }}>
              {tab === 'users' ? 'Équipe' : 'Labels'}
            </button>
          ))}
          <button onClick={() => setShowPanel(false)}
            style={{ width: '40px', height: '100%', background: 'none', border: 'none', color: 'var(--gh-text-muted)', fontSize: '18px', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gh-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--gh-text-muted)')}>×</button>
        </div>

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {activeTab === 'users'
            ? <UserPanel users={users} onClose={() => setShowPanel(false)}
                onAddUser={u => setUsers(p => [...p, u])}
                onUpdateUser={u => setUsers(p => p.map(x => x.id === u.id ? u : x))}
                onDeleteUser={id => setUsers(p => p.filter(x => x.id !== id))} />
            : <LabelPanel labels={labels}
                onAddLabel={l => setLabels(p => [...p, l].sort((a, b) => a.name.localeCompare(b.name)))}
                onUpdateLabel={l => setLabels(p => p.map(x => x.id === l.id ? l : x))}
                onDeleteLabel={id => setLabels(p => p.filter(x => x.id !== id))} />
          }
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
