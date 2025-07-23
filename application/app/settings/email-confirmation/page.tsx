'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail, ArrowRight } from 'lucide-react'

export default function EmailChangeConfirmationPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [message, setMessage] = useState('')

  useEffect(() => {
    const urlMessage = searchParams.get('message')
    if (urlMessage) {
      setMessage(decodeURIComponent(urlMessage))
    }
  }, [searchParams])

  const isConfirmationMessage = message.includes('Confirmation link accepted')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center py-12">
      <div className="max-w-lg mx-auto px-4">
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">
              {isConfirmationMessage ? 'Première étape confirmée !' : 'Confirmation reçue'}
            </CardTitle>
            <CardDescription>
              {isConfirmationMessage 
                ? 'Votre demande de changement d\'email a été validée'
                : 'Votre action a été traitée'
              }
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {message && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm">{message}</p>
              </div>
            )}

            {isConfirmationMessage && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Prochaine étape
                  </h3>
                  <p className="text-yellow-800 text-sm">
                    Un email de confirmation a été envoyé à votre <strong>nouvelle adresse email</strong>. 
                    Vérifiez votre boîte de réception et cliquez sur le lien pour finaliser le changement.
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">🔄 Processus de changement d&apos;email :</h4>
                  <ol className="text-sm text-gray-700 space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="line-through">Confirmer depuis l&apos;ancien email</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Confirmer depuis le nouvel email</span>
                    </li>
                  </ol>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => router.push('/settings/change-email')}
                className="flex-1"
              >
                Retour au changement d&apos;email
              </Button>
              <Button 
                onClick={() => router.push('/settings')}
                className="flex-1"
              >
                Retour aux paramètres
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
