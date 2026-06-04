import { useEffect, useState } from 'react';
import Board from './components/Board';
import LabelPanel from './components/LabelPanel';
import UserPanel from './components/UserPanel';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  avatar_data?: string;
  created_at: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'labels'>('users');

  useEffect(() => {
    Promise.all([
      fetch('/api/v1/users').then((r) => r.json()),
      fetch('/api/v1/labels').then((r) => r.json()),
    ])
      .then(([u, l]) => { setUsers(u); setLabels(l); })
      .finally(() => setLoading(false));
  }, []);

  const openPanel = (tab: 'users' | 'labels') => {
    setActiveTab(tab);
    setShowPanel(true);
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Chargement...</div>;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 shadow-lg sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">TaskHorizon</h1>
            <p className="text-slate-500 text-xs mt-0.5">Gérez vos tâches simplement</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Labels button */}
            <button
              onClick={() => openPanel('labels')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100 rounded-lg text-sm font-medium transition"
            >
              <div className="flex -space-x-1">
                {labels.slice(0, 3).map((l) => (
                  <div key={l.id} className="w-3.5 h-3.5 rounded-full border border-slate-800" style={{ backgroundColor: l.color }} />
                ))}
              </div>
              <span>Labels</span>
              {labels.length > 0 && (
                <span className="bg-slate-700 text-slate-300 text-xs rounded-full px-1.5 py-0.5">{labels.length}</span>
              )}
            </button>

            {/* Team button */}
            <button
              onClick={() => openPanel('users')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100 rounded-lg text-sm font-medium transition"
            >
              <div className="flex -space-x-1.5">
                {users.slice(0, 3).map((u) =>
                  u.avatar_data || u.avatar_url ? (
                    <img key={u.id} src={u.avatar_data || u.avatar_url} alt={u.name}
                      className="w-6 h-6 rounded-full object-cover border-2 border-slate-800" />
                  ) : (
                    <div key={u.id} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-slate-800 flex items-center justify-center text-white font-bold" style={{ fontSize: '9px' }}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )
                )}
              </div>
              <span>Équipe</span>
              {users.length > 0 && (
                <span className="bg-slate-700 text-slate-300 text-xs rounded-full px-1.5 py-0.5">{users.length}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto py-8 px-6">
        <Board users={users} labels={labels} />
      </main>

      {/* Backdrop */}
      {showPanel && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30" onClick={() => setShowPanel(false)} />
      )}

      {/* Right panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${showPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Tabs */}
        <div className="flex border-b border-slate-700 flex-shrink-0">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3.5 text-sm font-medium transition ${activeTab === 'users' ? 'text-slate-100 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}>
            Équipe
          </button>
          <button
            onClick={() => setActiveTab('labels')}
            className={`flex-1 py-3.5 text-sm font-medium transition ${activeTab === 'labels' ? 'text-slate-100 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}>
            Labels
          </button>
          <button onClick={() => setShowPanel(false)}
            className="px-4 text-slate-500 hover:text-slate-200 text-xl transition" title="Fermer">×</button>
        </div>

        {/* Panel content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'users' ? (
            <UserPanel
              users={users}
              onClose={() => setShowPanel(false)}
              onAddUser={(u) => setUsers((prev) => [...prev, u])}
              onUpdateUser={(u) => setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
              onDeleteUser={(id) => setUsers((prev) => prev.filter((x) => x.id !== id))}
            />
          ) : (
            <LabelPanel
              labels={labels}
              onAddLabel={(l) => setLabels((prev) => [...prev, l].sort((a, b) => a.name.localeCompare(b.name)))}
              onUpdateLabel={(l) => setLabels((prev) => prev.map((x) => (x.id === l.id ? l : x)))}
              onDeleteLabel={(id) => setLabels((prev) => prev.filter((x) => x.id !== id))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
