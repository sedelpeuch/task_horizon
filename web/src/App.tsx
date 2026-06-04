import { useEffect, useState } from 'react';
import Board from './components/Board';

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
  const [showUserForm, setShowUserForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userAvatar, setUserAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/v1/users');
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName, email: userEmail }),
      });

      if (!res.ok) throw new Error('Failed to create user');
      const newUser = await res.json();

      // Upload avatar if provided
      if (userAvatar) {
        const formData = new FormData();
        formData.append('file', userAvatar);
        const avatarRes = await fetch(`/api/v1/users/${newUser.id}/avatar`, {
          method: 'POST',
          body: formData,
        });
        if (avatarRes.ok) {
          const updatedUser = await avatarRes.json();
          setUsers([...users, updatedUser]);
        } else {
          setUsers([...users, newUser]);
        }
      } else {
        setUsers([...users, newUser]);
      }

      setUserName('');
      setUserEmail('');
      setUserAvatar(null);
      setAvatarPreview('');
      setShowUserForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUserAvatar(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="bg-slate-900 border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto py-8 px-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-slate-100 mb-1">TaskHorizon</h1>
              <p className="text-slate-400 text-sm">Manage your tasks seamlessly</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-slate-400 text-sm">{users.length} user{users.length !== 1 ? 's' : ''}</p>
              </div>
              {!showUserForm && (
                <button
                  onClick={() => setShowUserForm(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                >
                  + Add User
                </button>
              )}
            </div>
          </div>

          {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-lg text-sm">{error}</div>}

          {showUserForm && (
            <form onSubmit={handleAddUser} className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="User name..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 text-slate-100 placeholder-slate-400 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email..."
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 text-slate-100 placeholder-slate-400 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-slate-300 mb-2">Avatar (optional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="w-full px-3 py-2 rounded-lg bg-slate-700 text-slate-100 text-sm border border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 file:mr-3 file:px-3 file:py-1 file:rounded file:bg-blue-600 file:text-white file:text-xs file:font-medium file:cursor-pointer"
                    disabled={submitting}
                  />
                </div>
                {avatarPreview && (
                  <div className="flex-shrink-0">
                    <img
                      src={avatarPreview}
                      alt="Avatar preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-600"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                >
                  {submitting ? 'Adding...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserForm(false);
                    setUserName('');
                    setUserEmail('');
                    setUserAvatar(null);
                    setAvatarPreview('');
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-12 px-6">
        <Board users={users} setUsers={setUsers} />
      </main>
    </div>
  );
}
