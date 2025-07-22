'use client';
import Link from 'next/link';

export default function SettingsIndex() {
  return (
    <div className="max-w-md mx-auto mt-10 space-y-4">
      <h1 className="text-2xl">Paramètres</h1>
      <ul className="list-disc list-inside">
        <li>
          <Link href="/settings/email" className="text-blue-500 hover:underline">
            Changer mon email
          </Link>
        </li>
      </ul>
    </div>
  );
}
