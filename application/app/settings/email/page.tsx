'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ChangeEmailPage() {
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const token = localStorage.getItem('supabase.auth.token');
        if (!token) {
          router.push('/auth/signin');
          return;
        }
        const res = await fetch('/api/user/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentEmail(data.email || '');
        } else {
          router.push('/auth/signin');
        }
      } catch {
        router.push('/auth/signin');
      }
    }
    fetchUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (newEmail !== confirmEmail) {
      setError('Les emails ne correspondent pas');
      return;
    }
    if (newEmail === currentEmail) {
      setError('Le nouvel email doit être différent');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('supabase.auth.token');
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ newEmail, currentPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setNewEmail('');
        setConfirmEmail('');
        setCurrentPassword('');
      } else {
        setError(data.error || 'Erreur changement email');
      }
    } catch {
      setError('Erreur réseau. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl mb-4">Changer l’email</h1>
      <div className="mb-4 p-3 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">Email actuel :</p>
        <p className="font-medium">{currentEmail}</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="newEmail" className="block text-sm">Nouvel email</label>
          <input
            id="newEmail"
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            required
            className="w-full border px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="confirmEmail" className="block text-sm">Confirmer nouvel email</label>
          <input
            id="confirmEmail"
            type="email"
            value={confirmEmail}
            onChange={e => setConfirmEmail(e.target.value)}
            required
            className="w-full border px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="currentPassword" className="block text-sm">Mot de passe actuel</label>
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            required
            className="w-full border px-2 py-1"
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        {message && <p className="text-green-600">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white py-2 rounded"
        >
          {loading ? 'Changement...' : 'Changer email'}
        </button>
      </form>
    </div>
  );
}
