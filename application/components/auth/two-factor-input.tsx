"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Key, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface TwoFactorInputProps {
  onVerify: (code: string) => void;
  onBackupCode: (code: string) => void;
  showBackupOption?: boolean;
  isPending?: boolean;
  placeholder?: string;
}

export function TwoFactorInput({
  onVerify,
  onBackupCode,
  showBackupOption = true,
  isPending = false,
  placeholder = "Enter 6-digit code"
}: TwoFactorInputProps) {
  const [code, setCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error("Please enter a code");
      return;
    }

    if (useBackupCode) {
      onBackupCode(code.trim());
    } else {
      // Validate TOTP format (6 digits)
      if (!/^\d{6}$/.test(code.trim())) {
        toast.error("Please enter a 6-digit code");
        return;
      }
      onVerify(code.trim());
    }
  };

  const handleCodeChange = (value: string) => {
    // Pour TOTP: seulement les chiffres, max 6
    // Pour backup: permettre alphanumerique, max 8
    if (useBackupCode) {
      if (value.length <= 8) {
        setCode(value.toUpperCase());
      }
    } else {
      const numericValue = value.replace(/\D/g, "");
      if (numericValue.length <= 6) {
        setCode(numericValue);
      }
    }
  };

  const toggleBackupMode = () => {
    setUseBackupCode(!useBackupCode);
    setCode("");
    setShowHelp(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            {useBackupCode ? (
              <>
                <Key className="h-4 w-4" />
                Backup Code
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Authenticator Code
              </>
            )}
          </Label>
          
          <div className="relative">
            <Input
              type="text"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder={useBackupCode ? "Enter backup code" : placeholder}
              className="h-12 text-center text-lg font-mono tracking-widest"
              autoComplete="off"
              autoFocus
            />
            
            {showHelp && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 h-8 w-8 p-0"
                onClick={() => setShowHelp(!showHelp)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Instructions dynamiques */}
          <p className="text-sm text-muted-foreground text-center">
            {useBackupCode 
              ? "Enter one of your 8-character backup codes"
              : "Enter the 6-digit code from your authenticator app"
            }
          </p>
        </div>

        <Button 
          type="submit" 
          className="w-full h-11" 
          disabled={isPending || !code.trim()}
        >
          {isPending ? "Verifying..." : "Verify"}
        </Button>
      </form>

      {/* Option pour basculer vers backup codes */}
      {showBackupOption && (
        <div className="text-center">
          <Button
            type="button"
            variant="link"
            onClick={toggleBackupMode}
            className="text-sm text-muted-foreground hover:text-foreground"
            disabled={isPending}
          >
            {useBackupCode 
              ? "Use authenticator app instead" 
              : "Use backup code instead"
            }
          </Button>
        </div>
      )}

      {/* Aide contextuelle */}
      {showHelp && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="space-y-2 text-sm">
              <h4 className="font-medium flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Need help?
              </h4>
              {useBackupCode ? (
                <div className="space-y-1">
                  <p>• Backup codes are 8-character codes you saved when setting up 2FA</p>
                  <p>• Each backup code can only be used once</p>
                  <p>• They&apos;re typically in format: ABC1-DEF2</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p>• Open your authenticator app (Google Authenticator, Authy, etc.)</p>
                  <p>• Find the 6-digit code for this account</p>
                  <p>• The code changes every 30 seconds</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle help */}
      <div className="text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs text-muted-foreground"
        >
          {showHelp ? "Hide help" : "Need help?"}
        </Button>
      </div>
    </div>
  );
}
