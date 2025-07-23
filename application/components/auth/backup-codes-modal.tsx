"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, Check, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";

interface BackupCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  backupCodes: string[];
  onSaved: () => void;
}

export function BackupCodesModal({ isOpen, onClose, backupCodes, onSaved }: BackupCodesModalProps) {
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const downloadCodes = () => {
    const codesText = `Backup Codes for Two-Factor Authentication
Generated: ${new Date().toLocaleDateString()}

IMPORTANT: Store these codes in a secure location.
Each code can only be used once.

${backupCodes.map((code, index) => `${index + 1}. ${code}`).join('\n')}

Instructions:
- Use these codes if you lose access to your authenticator app
- Each code can only be used once
- Generate new codes if you run out
- Keep these codes secure and private`;

    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Backup codes downloaded");
  };

  const copyCodes = async () => {
    try {
      const codesText = backupCodes.join('\n');
      await navigator.clipboard.writeText(codesText);
      setCopied(true);
      toast.success("Backup codes copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy backup codes");
    }
  };

  const handleSave = () => {
    if (!hasConfirmed) {
      toast.error("Please confirm that you have saved your backup codes");
      return;
    }
    onSaved();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Save Your Backup Codes
          </DialogTitle>
          <DialogDescription>
            Store these codes safely. You'll need them if you lose access to your authenticator app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Alert */}
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-red-900">Important Security Notice</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    <li>• Each code can only be used once</li>
                    <li>• Store them in a secure, accessible location</li>
                    <li>• Don't share these codes with anyone</li>
                    <li>• Generate new codes if you run out</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Backup Codes Grid */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Your Backup Codes</h4>
                  <Badge variant="outline" className="text-xs">
                    {backupCodes.length} codes
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-gray-50 border rounded-lg p-3 text-center font-mono text-sm"
                    >
                      <span className="text-xs text-gray-500 block mb-1">
                        {index + 1}
                      </span>
                      <span className="text-gray-900 font-semibold tracking-wider">
                        {code}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={downloadCodes}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={copyCodes}
                    disabled={copied}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="confirm-saved"
                  checked={hasConfirmed}
                  onCheckedChange={setHasConfirmed}
                />
                <div className="space-y-1">
                  <label 
                    htmlFor="confirm-saved"
                    className="text-sm font-medium text-blue-900 cursor-pointer"
                  >
                    I have saved my backup codes in a secure location
                  </label>
                  <p className="text-xs text-blue-700">
                    You won't be able to see these codes again after closing this dialog.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasConfirmed}
            className="bg-green-600 hover:bg-green-700"
          >
            I've Saved My Codes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
