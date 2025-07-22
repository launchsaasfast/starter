'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OAuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || `${provider} OAuth échoué`);
      }
    } catch (err) {
      setError('Erreur connexion. Réessayez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl mb-4">Connexion Sociale</h1>
      <div className="space-y-4">
        <button
          onClick={() => handleOAuthSignIn('google')}
          disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white py-2 px-4 rounded flex items-center justify-center space-x-2"
        >
          <span>🔍</span>
          <span>{loading ? 'Connexion...' : 'Continuer avec Google'}</span>
        </button>
        <button
          onClick={() => handleOAuthSignIn('github')}
          disabled={loading}
          className="w-full bg-gray-800 hover:bg-gray-900 disabled:bg-gray-400 text-white py-2 px-4 rounded flex items-center justify-center space-x-2"
        >
          <span>🐙</span>
          <span>{loading ? 'Connexion...' : 'Continuer avec GitHub'}</span>
        </button>
      </div>
      {error && <p className="text-red-600 mt-4">{error}</p>}
      <div className="mt-6 text-center">
        <a href="/auth/signin" className="text-blue-500 hover:underline">
          ← Retour connexion email
        </a>
      </div>
    </div>
  );
}
