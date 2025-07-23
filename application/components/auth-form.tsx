"use client";
import { Suspense } from "react";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { validatePassword, validateEmail } from "@/validation/auth-validation";
import { Confirm } from "./auth-conf";
import { AUTH_CONFIG } from "@/config/auth";
import { BackButton } from "./back-button";
import { api } from "@/utils/api";
import Link from "next/link";

type AuthFormProps = {
  requires2fa?: boolean;
  nextUrl?: string;
  initialMethods?: Array<{ type: string; factorId: string }>;
  initialEmail?: string | null;
};

export function AuthFormAdvanced({
  requires2fa = false,
  nextUrl = "/dashboard",
  initialMethods = [],
  initialEmail = null,
}: AuthFormProps) {
  const router = useRouter();

  const initialTwoFactorState = useMemo(() => {
    return {
      requiresTwoFactor: requires2fa,
      redirectUrl: nextUrl,
      availableMethods: initialMethods,
    };
  }, [requires2fa, nextUrl, initialMethods]);

  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(initialEmail || "");
  const [formError, setFormError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [determinedType, setDeterminedType] = useState<"login" | "signup" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState<{
    availableMethods: Array<{ type: string; factorId: string }>;
    redirectUrl: string;
  } | null>(
    initialTwoFactorState.requiresTwoFactor
      ? {
          availableMethods: initialTwoFactorState.availableMethods.map((m) => ({
            ...m,
            type: m.type,
          })),
          redirectUrl: initialTwoFactorState.redirectUrl,
        }
      : null
  );

  async function handleEmailCheck(email: string) {
    try {
      setIsPending(true);
      const data = await api.auth.checkEmail(email);
      setDeterminedType(data.exists ? "login" : "signup");
      setShowPasswordField(true);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleSubmit(formData: FormData) {
    const emailValue = formData.get("email") as string;

    if (!showPasswordField) {
      const emailValidation = validateEmail(emailValue);
      if (!emailValidation.isValid) {
        setFormError(emailValidation.error || "Invalid email");
        return;
      }
      setFormError(null);
      await handleEmailCheck(emailValue);
      return;
    }

    if (!determinedType) {
      setFormError("Please check your email first");
      return;
    }

    if (determinedType === "login") {
      if (!email || !password) {
        setFormError("Please enter your email and password");
        return;
      }
    } else {
      const passwordValidation = validatePassword(password);
      const emailValidation = validateEmail(email);
      if (!passwordValidation.isValid || !emailValidation.isValid) {
        setFormError(
          passwordValidation.error || emailValidation.error || "Invalid form"
        );
        return;
      }
    }
    setFormError(null);

    try {
      setIsPending(true);

      if (determinedType === "login") {
        const result = await api.auth.login({ email, password });
        if (!result) return;
        if (result.requiresTwoFactor && result.availableMethods) {
          setLoginData({
            availableMethods: result.availableMethods,
            redirectUrl: result.redirectTo ?? nextUrl,
          });
          return;
        }
      } else {
        await api.auth.signup({ email, password });
        setShowConfirm(true);
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerifyComplete() {
    if (loginData?.redirectUrl) {
      router.push(loginData.redirectUrl);
    }
  }

  function handleBack() {
    if (!showPasswordField) {
      router.back();
      return;
    }

    setPassword("");
    setShowPasswordField(false);
    setDeterminedType(null);
    setFormError(null);
  }

  return (
    <>
      <div className="absolute top-0 left-0 p-4">
        <BackButton onClick={handleBack} />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-bold">
              {loginData
                ? "Two-factor authentication"
                : showPasswordField
                  ? determinedType === "login"
                    ? "Welcome back"
                    : "Create your account"
                  : "Sign up or log in"}
            </CardTitle>
            <CardDescription className="text-foreground/35">
              {loginData
                ? "Please verify your identity to continue"
                : showPasswordField
                  ? determinedType === "login"
                    ? "Enter your password to continue"
                    : "Create a password to get started"
                  : "Enter your email to continue"}
            </CardDescription>
          </div>
          {!loginData && !showPasswordField && <SocialButtons />} 
        </CardHeader>
        <CardContent>
          {!loginData && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await handleSubmit(formData);
              }}
              className="flex flex-col gap-5"
            >
              {/* form fields... */}
            </form>
          )}
        </CardContent>
        {!loginData && showPasswordField && (
          <CardFooter className="flex flex-col gap-2 border-t p-5">
            {/* footer buttons... */}
          </CardFooter>
        )}
      </Card>
      <Confirm
        email={email}
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
      />
    </>
  );
}

export function SocialButtons() {
  const [isPending, setIsPending] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setIsPending(true);
      const data = await api.auth.googleSignIn();
      if (data.url) window.location.href = data.url;
    } finally {
      setIsPending(false);
    }
  }

  async function handleGithubSignIn() {
    try {
      setIsPending(true);
      const data = await api.auth.githubSignIn();
      if (data.url) window.location.href = data.url;
    } finally {
      setIsPending(false);
    }
  }

  if (
    !AUTH_CONFIG.socialProviders.google.enabled &&
    !AUTH_CONFIG.socialProviders.github.enabled
  ) {
    return null;
  }

  return (
    <div className="flex gap-2">
      {AUTH_CONFIG.socialProviders.google.enabled && (
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isPending}>
          <FaGoogle className="w-4 h-4" />
          Google
        </Button>
      )}
      {AUTH_CONFIG.socialProviders.github.enabled && (
        <Button variant="outline" className="w-full" onClick={handleGithubSignIn} disabled={isPending}>
          <FaGithub className="w-4 h-4" />
          GitHub
        </Button>
      )}
    </div>
  );
}
