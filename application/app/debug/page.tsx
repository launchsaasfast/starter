'use client';

import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPage() {
  const searchParams = useSearchParams();
  
  const allParams = Object.fromEntries(searchParams.entries());

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Debug URL Parameters</CardTitle>
          <CardDescription>
            Cette page affiche tous les paramètres reçus dans l'URL
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">URL actuelle:</h3>
              <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                {window.location.href}
              </code>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">Paramètres extraits:</h3>
              <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                {JSON.stringify(allParams, null, 2)}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-sm text-gray-700 mb-2">Paramètres individuels:</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><strong>token:</strong> {searchParams.get('token') || 'null'}</div>
                <div><strong>code:</strong> {searchParams.get('code') || 'null'}</div>
                <div><strong>type:</strong> {searchParams.get('type') || 'null'}</div>
                <div><strong>access_token:</strong> {searchParams.get('access_token') || 'null'}</div>
                <div><strong>refresh_token:</strong> {searchParams.get('refresh_token') || 'null'}</div>
                <div><strong>error:</strong> {searchParams.get('error') || 'null'}</div>
                <div><strong>error_description:</strong> {searchParams.get('error_description') || 'null'}</div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-medium text-sm text-gray-700 mb-2">Actions recommandées:</h3>
              <div className="space-y-2 text-sm">
                {searchParams.get('code') && (
                  <div className="text-blue-600">
                    ✓ Code détecté → Rediriger vers /auth/reset-password
                  </div>
                )}
                {searchParams.get('token') && (
                  <div className="text-green-600">
                    ✓ Token détecté → Rediriger vers /auth/verify ou /auth/reset-password selon le type
                  </div>
                )}
                {searchParams.get('access_token') && (
                  <div className="text-purple-600">
                    ✓ Access token détecté → Format legacy
                  </div>
                )}
                {(!searchParams.get('code') && !searchParams.get('token') && !searchParams.get('access_token')) && (
                  <div className="text-red-600">
                    ⚠ Aucun token détecté
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
