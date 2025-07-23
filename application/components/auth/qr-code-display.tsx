"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Smartphone, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface QRCodeDisplayProps {
  secret: string;
  qrCodeUrl: string;
  email: string;
}

export function QRCodeDisplay({ secret, qrCodeUrl, email }: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Secret copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
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
            {/* QR Code placeholder - in real implementation, use react-qr-code */}
            <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="text-xs text-gray-500 font-mono">QR CODE</div>
                <div className="text-xs text-gray-400">
                  Scan with
                  <br />
                  authenticator app
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-gray-600 text-center max-w-xs">
            Can't scan? Use the manual setup key below instead
          </p>
        </CardContent>
      </Card>

      {/* Manual Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manual Setup</CardTitle>
          <CardDescription>
            Enter this key manually if you can't scan the QR code
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
