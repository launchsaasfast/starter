'use client'

import { useState, useEffect } from 'react'
import { createClientSupabaseClient } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackButton } from '@/components/back-button'
import { useRouter } from 'next/navigation'

export default function ChangeEmailPage() {
  const [currentEmail, setCurrentEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'waiting-old' | 'waiting-new' | 'success'>('form')
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    // Récupérer l'email actuel de l'utilisateur
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setCurrentEmail(user.email)
      }
    }
    getUser()
  }, [supabase])

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail || !password) {
      setError('Veuillez remplir tous les champs')
      return
    }

    if (newEmail === currentEmail) {
      setError('Le nouvel email doit être différent de l\'email actuel')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Vérifier d'abord le mot de passe
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentEmail,
        password: password
      })

      if (signInError) {
        setError('Mot de passe incorrect')
        setLoading(false)
        return
      }

      // Changer l'email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail
      })

      if (updateError) {
        setError('Erreur lors du changement d\'email: ' + updateError.message)
      } else {
        setStep('waiting-old')
        setMessage('Un email de confirmation a été envoyé à votre ancienne adresse email pour confirmer le changement.')
      }
    } catch (error) {
      setError('Une erreur inattendue s\'est produite')
    } finally {
      setLoading(false)
    }
  }

  const renderContent = () => {
    switch (step) {
      case 'form':
        return (
          <form onSubmit={handleEmailChange} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="current-email">Email actuel</Label>
              <Input
                id="current-email"
                type="email"
                value={currentEmail}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email">Nouvel email</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nouveau@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe actuel</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                required
              />
              <p className="text-sm text-gray-600">
                Pour des raisons de sécurité, confirmez votre mot de passe
              </p>
            </div>

            {error && (
              <div className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Changement en cours...' : 'Changer mon email'}
            </Button>
          </form>
        )

      case 'waiting-old':
        return (
          <div className="space-y-6 text-center">
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                📧 Première étape : Confirmez depuis votre ancien email
              </h3>
              <p className="text-blue-800">
                Un email de confirmation a été envoyé à <strong>{currentEmail}</strong>
              </p>
              <p className="text-blue-700 mt-2">
                Cliquez sur le lien dans cet email pour confirmer que vous souhaitez changer votre adresse.
              </p>
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                💡 <strong>Astuce :</strong> Une fois que vous aurez cliqué sur le lien, 
                un second email sera envoyé à votre nouvelle adresse ({newEmail}) pour finaliser le changement.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('form')}
                className="flex-1"
              >
                Retour au formulaire
              </Button>
              <Button 
                onClick={() => router.push('/settings')}
                className="flex-1"
              >
                Retour aux paramètres
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <BackButton onClick={() => router.push('/settings')} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Changer mon adresse email</CardTitle>
            <CardDescription>
              Modifiez l'adresse email associée à votre compte
            </CardDescription>
          </CardHeader>

          <CardContent>
            {message && (
              <div className="mb-6 p-4 text-sm text-green-800 bg-green-50 border border-green-200 rounded-md">
                {message}
              </div>
            )}

            {renderContent()}
          </CardContent>

          {step === 'form' && (
            <CardFooter className="text-sm text-gray-600">
              <div className="space-y-2">
                <p>🔒 Processus sécurisé en 2 étapes :</p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>Confirmation depuis votre email actuel</li>
                  <li>Validation depuis votre nouvel email</li>
                </ul>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}
