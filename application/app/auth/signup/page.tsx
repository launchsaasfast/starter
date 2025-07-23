"use client";
import Link from "next/link";
import { AuthFormAdvanced } from '@/components/ui/auth-form-advanced';
import { BackButton } from "@/components/back-button";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <BackButton />
        <AuthFormAdvanced
          mode="signup"
          nextUrl="/settings"
          initialEmail={null}
        />
        
        {/* Lien vers la page de connexion */}
        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link 
            href="/auth/signin" 
            className="text-primary hover:underline font-medium transition-colors duration-200"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
