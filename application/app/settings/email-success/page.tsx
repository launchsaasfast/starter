'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabaseClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, Mail, Settings } from 'lucide-react'

export default function EmailChangeSuccessPage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }
    }
    getUser()
  }, [supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center py-12">
      <div className="max-w-lg mx-auto px-4">
        <Card className="bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">
              Email changé avec succès !
            </CardTitle>
            <CardDescription>
              Votre adresse email a été mise à jour
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <Mail className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-medium">
                  Nouvelle adresse email confirmée
                </p>
                {userEmail && (
                  <p className="text-green-700 text-sm mt-1">
                    {userEmail}
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">📝 Que faire maintenant ?</h3>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• Votre nouvelle adresse email est maintenant active</li>
                <li>• Utilisez-la pour vous connecter à votre compte</li>
                <li>• Mettez à jour vos autres services si nécessaire</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => router.push('/settings')}
                className="flex-1"
              >
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
              </Button>
              <Button 
                onClick={() => router.push('/')}
                className="flex-1"
              >
                Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
