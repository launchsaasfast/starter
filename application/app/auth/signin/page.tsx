"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      router.push('/');
    } else {
      setError(data.error || 'Signin failed');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <h1 className="text-2xl mb-4">Sign In</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border px-2 py-1"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full border px-2 py-1"
          />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <button type="submit" className="w-full bg-blue-500 text-white py-2">Sign In</button>
      </form>
    </div>
  );
}
