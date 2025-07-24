"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Smartphone, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
  secret: string;
  qrCodeUrl: string;
  email: string;
}

export function QRCodeDisplay({ secret, qrCodeUrl, email }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [qrCodeLoading, setQrCodeLoading] = useState(true);

  useEffect(() => {
    // Générer le QR code à partir de l'URL TOTP
    if (qrCodeUrl) {
      setQrCodeLoading(true);
      QRCode.toDataURL(qrCodeUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
      .then(dataUrl => {
        setQrCodeDataUrl(dataUrl);
        setQrCodeLoading(false);
      })
      .catch(error => {
        console.error('Error generating QR code:', error);
        toast.error('Erreur lors de la génération du QR code');
        setQrCodeLoading(false);
      });
    }
  }, [qrCodeUrl]);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Secret copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy secret");
    }
  };

  const displaySecret = showSecret 
    ? secret 
    : secret.replace(/(.{4})/g, '$1 ').trim();

  const maskedSecret = secret.replace(/./g, '•').replace(/(.{4})/g, '$1 ').trim();

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            Setup Instructions
          </CardTitle>
          <CardDescription className="text-blue-800">
            Follow these steps to secure your account with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-blue-900">
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-300 min-w-[24px] h-6 flex items-center justify-center text-xs">
                1
              </Badge>
              <span>
                Install an authenticator app like{" "}
                <strong>Google Authenticator</strong>, <strong>Authy</strong>, or{" "}
                <strong>1Password</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-300 min-w-[24px] h-6 flex items-center justify-center text-xs">
                2
              </Badge>
              <span>Scan the QR code below with your authenticator app</span>
            </li>
            <li className="flex items-start gap-2">
              <Badge variant="outline" className="bg-white text-blue-700 border-blue-300 min-w-[24px] h-6 flex items-center justify-center text-xs">
                3
              </Badge>
              <span>Enter the 6-digit code from your app to verify setup</span>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-lg">Scan QR Code</CardTitle>
          <CardDescription>
            Point your authenticator app at this QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="bg-white p-6 rounded-lg border-2 border-gray-200">
            {qrCodeLoading ? (
              <div className="w-48 h-48 flex items-center justify-center">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500 mx-auto" />
                  <div className="text-xs text-gray-500">Génération du QR code...</div>
                </div>
              </div>
            ) : qrCodeDataUrl ? (
              <img 
                src={qrCodeDataUrl} 
                alt="QR Code pour authentification 2FA" 
                className="w-48 h-48"
              />
            ) : (
              <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="text-xs text-gray-500 font-mono">QR CODE</div>
                  <div className="text-xs text-gray-400">
                    Erreur de génération
                    <br />
                    Utilisez la clé manuelle
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-600 text-center max-w-xs">
            {qrCodeDataUrl ? "Impossible de scanner ? Utilisez la clé manuelle ci-dessous" : "Utilisez la clé de configuration manuelle ci-dessous"}
          </p>
        </CardContent>
      </Card>

      {/* Manual Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manual Setup</CardTitle>
          <CardDescription>
            Enter this key manually if you can&apos;t scan the QR code
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="secret">Setup Key</Label>
            <div className="flex gap-2">
              <Input
                id="secret"
                value={showSecret ? displaySecret : maskedSecret}
                readOnly
                className="font-mono text-sm"
                type={showSecret ? "text" : "password"}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="px-3"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="px-3"
                onClick={copySecret}
                disabled={copied}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <strong>Account:</strong> {email}
            </div>
            <div>
              <strong>Type:</strong> Time-based (TOTP)
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              <strong>Important:</strong> Keep this setup key secure. You can use it to restore access to your authenticator app if needed.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
