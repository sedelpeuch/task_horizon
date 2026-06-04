import { useEffect, useState } from 'react';
import Board from './components/Board';
import UserPanel from './components/UserPanel';

interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  avatar_data?: string;
  created_at: string;
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUserPanel, setShowUserPanel] = useState(false);

  useEffect(() => {
    fetch('/api/v1/users')
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch users'); return r.json(); })
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Chargement...</div>;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 shadow-lg sticky top-0 z-20">
        <div className="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">TaskHorizon</h1>
            <p className="text-slate-500 text-xs mt-0.5">Gérez vos tâches simplement</p>
          </div>

          {error && <div className="p-2 bg-red-900/30 border border-red-700 text-red-300 rounded text-xs">{error}</div>}

          <button
            onClick={() => setShowUserPanel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-slate-100 rounded-lg text-sm font-medium transition"
          >
            <div className="flex -space-x-1.5">
              {users.slice(0, 3).map((u) => (
                u.avatar_data || u.avatar_url ? (
                  <img key={u.id} src={u.avatar_data || u.avatar_url} alt={u.name}
                    className="w-6 h-6 rounded-full object-cover border-2 border-slate-800" />
                ) : (
                  <div key={u.id} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-slate-800 flex items-center justify-center text-white font-bold" style={{ fontSize: '9px' }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                )
              ))}
            </div>
            <span>Équipe</span>
            {users.length > 0 && (
              <span className="bg-slate-700 text-slate-300 text-xs rounded-full px-1.5 py-0.5 font-medium">{users.length}</span>
            )}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-screen-2xl mx-auto py-8 px-6">
        <Board users={users} />
      </main>

      {/* Backdrop */}
      {showUserPanel && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
          onClick={() => setShowUserPanel(false)}
        />
      )}

      {/* Right panel */}
      <div className={`fixed top-0 right-0 h-full w-80 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${showUserPanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <UserPanel
          users={users}
          onClose={() => setShowUserPanel(false)}
          onAddUser={(u) => setUsers((prev) => [...prev, u])}
          onUpdateUser={(u) => setUsers((prev) => prev.map((x) => (x.id === u.id ? u : x)))}
          onDeleteUser={(id) => setUsers((prev) => prev.filter((x) => x.id !== id))}
        />
      </div>
    </div>
  );
}
