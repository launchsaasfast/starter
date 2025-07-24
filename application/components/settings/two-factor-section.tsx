"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Shield, Smartphone, Key, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { auth2FAApi, MFAStatus } from "@/utils/api";
import { QRCodeDisplay } from "@/components/auth/qr-code-display";
import { TwoFactorInput } from "@/components/auth/two-factor-input";
import { BackupCodesModal } from "@/components/auth/backup-codes-modal";

type SetupState = "inactive" | "setting_up" | "verifying" | "show_backup_codes";

export function TwoFactorSection() {
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [setupState, setSetupState] = useState<SetupState>("inactive");
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);

  // Setup data
  const [totpSecret, setTotpSecret] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);

  useEffect(() => {
    loadMFAStatus();
  }, []);

  async function loadMFAStatus() {
    try {
      setIsLoading(true);
      const status = await auth2FAApi.getStatus();
      setMfaStatus(status);
    } catch (error) {
      console.error("Error loading MFA status:", error);
      toast.error("Erreur lors du chargement du statut 2FA");
    } finally {
      setIsLoading(false);
    }
  }

  async function initiate2FASetup() {
    try {
      setIsPending(true);
      const setupData = await auth2FAApi.setup();
      
      setTotpSecret(setupData.secret);
      setQrCodeUrl(setupData.qrCodeUrl);
      setBackupCodes(setupData.backupCodes);
      setSetupState("setting_up");
      
      toast.success("Configuration 2FA initiée");
    } catch (error) {
      console.error("2FA setup error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la configuration 2FA");
    } finally {
      setIsPending(false);
    }
  }

  async function verify2FASetup(code: string) {
    try {
      setIsPending(true);
      const result = await auth2FAApi.verify(code, 'totp');
      
      if (result.success) {
        setSetupState("show_backup_codes");
        setShowBackupCodesModal(true);
        toast.success("2FA activé avec succès !");
        await loadMFAStatus(); // Refresh status
      }
    } catch (error) {
      console.error("2FA verification error:", error);
      toast.error(error instanceof Error ? error.message : "Code invalide");
    } finally {
      setIsPending(false);
    }
  }

  async function disable2FA() {
    try {
      setIsPending(true);
      // Pour l'instant, on simulate avec un mot de passe vide - à améliorer avec une modal
      await auth2FAApi.disable(""); 
      
      setMfaStatus({ enabled: false, factors: [], hasBackupCodes: false });
      setSetupState("inactive");
      toast.success("2FA désactivé");
    } catch (error) {
      console.error("2FA disable error:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la désactivation");
    } finally {
      setIsPending(false);
    }
  }

  function handleBackupCodesSaved() {
    setShowBackupCodesModal(false);
    setSetupState("inactive");
    toast.success("Configuration 2FA terminée avec succès !");
  }

  function cancelSetup() {
    setSetupState("inactive");
    setTotpSecret("");
    setQrCodeUrl("");
    setBackupCodes([]);
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentification à deux facteurs (2FA)
          </CardTitle>
          <CardDescription>
            Ajoutez une couche de sécurité supplémentaire à votre compte
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Statut actuel */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {mfaStatus?.enabled ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">2FA activé</p>
                    <p className="text-sm text-green-700">Votre compte est protégé</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">2FA désactivé</p>
                    <p className="text-sm text-red-700">Votre compte n'est pas protégé</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              {mfaStatus?.enabled && (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  <Smartphone className="h-3 w-3 mr-1" />
                  TOTP
                </Badge>
              )}
            </div>
          </div>

          {/* Actions selon l'état */}
          {setupState === "inactive" && (
            <div className="space-y-4">
              {!mfaStatus?.enabled ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="space-y-2">
                        <h4 className="font-medium text-blue-900">Pourquoi activer 2FA ?</h4>
                        <ul className="text-sm text-blue-800 space-y-1">
                          <li>• Protection contre le piratage de mot de passe</li>
                          <li>• Sécurité renforcée pour vos données sensibles</li>
                          <li>• Conformité aux bonnes pratiques de sécurité</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={initiate2FASetup}
                    className="w-full"
                    disabled={isPending}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Activer la 2FA
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="font-medium text-green-900">Statut</p>
                      <p className="text-green-700">Activé et vérifié</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="font-medium text-blue-900">Codes de récupération</p>
                      <p className="text-blue-700">{mfaStatus.hasBackupCodes ? "Disponibles" : "Non configurés"}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => toast.info("Fonctionnalité en développement")}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Générer nouveaux codes de récupération
                    </Button>
                    
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={disable2FA}
                      disabled={isPending}
                    >
                      Désactiver la 2FA
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuration en cours */}
          {setupState === "setting_up" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="font-medium mb-2">Configurez votre application d'authentification</h3>
                <p className="text-sm text-muted-foreground">
                  Scannez le QR code ou saisissez la clé manuelle
                </p>
              </div>

              <QRCodeDisplay
                secret={totpSecret}
                qrCodeUrl={qrCodeUrl}
                email="user@example.com" // À remplacer par l'email réel
              />

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Vérifiez votre configuration</h4>
                <TwoFactorInput
                  onVerify={verify2FASetup}
                  onBackupCode={() => {}} // Pas de backup codes à ce stade
                  showBackupOption={false}
                  isPending={isPending}
                  placeholder="Entrez le code à 6 chiffres"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={cancelSetup}
                  className="flex-1"
                  disabled={isPending}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal pour les codes de récupération */}
      <BackupCodesModal
        isOpen={showBackupCodesModal}
        onClose={() => setShowBackupCodesModal(false)}
        backupCodes={backupCodes}
        onSaved={handleBackupCodesSaved}
      />
    </>
  );
}
