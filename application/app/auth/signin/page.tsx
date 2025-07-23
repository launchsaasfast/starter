"use client";
import Link from "next/link";
import { AuthFormAdvanced } from '@/components/auth-form';
import { BackButton } from "@/components/back-button";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <BackButton />
        <AuthFormAdvanced
          mode="signin"
          nextUrl="/settings"
          initialEmail={null}
        />
        
        {/* Lien mot de passe oublié */}
        <div className="text-center">
          <Link 
            href="/auth/forgot-password" 
            className="text-sm text-muted-foreground hover:text-primary transition-colors duration-200 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>
        
        {/* Lien vers la page d'inscription */}
        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link 
            href="/auth/signup" 
            className="text-primary hover:underline font-medium transition-colors duration-200"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
