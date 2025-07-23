"use client";
import { AuthFormAdvanced } from '@/components/ui/auth-form-advanced';

export default function SignInPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <AuthFormAdvanced
          mode="signin"
          nextUrl="/settings"
          initialEmail={null}
        />
      </div>
    </div>
  );
}
