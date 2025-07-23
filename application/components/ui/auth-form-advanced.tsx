"use client";
import { useState, useEffect } from "react";
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
import { AUTH_CONFIG } from "@/config/auth";
import { api } from "@/utils/api";

type AuthFormProps = {
  mode?: "signin" | "signup" | "auto"; // auto = détection automatique
  nextUrl?: string;
  initialEmail?: string | null;
};

export function AuthFormAdvanced({
  mode = "auto",
  nextUrl = "/dashboard",
  initialEmail = null,
}: AuthFormProps) {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [email, setEmail] = useState(initialEmail || "");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPasswordField, setShowPasswordField] = useState(mode !== "auto");
  const [determinedType, setDeterminedType] = useState<"login" | "signup" | null>(
    mode === "auto" ? null : mode === "signin" ? "login" : "signup"
  );

  useEffect(() => {
    if (mode === "auto" && !email) {
      setEmail(initialEmail || "");
    }
  }, [mode, initialEmail]);

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

    // En mode auto, on doit d'abord vérifier l'email
    if (mode === "auto" && !showPasswordField) {
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
      if (!email || !password) {
        setFormError("Please enter your email and password");
        return;
      }
      if (password !== confirmPassword) {
        setFormError("Passwords do not match");
        return;
      }
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
        if (result) {
          router.push(nextUrl);
        }
      } else {
        await api.auth.signup({ email, password });
        router.push(nextUrl);
      }
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
    } finally {
      setIsPending(false);
    }
  }

  function handleBack() {
    if (mode !== "auto") {
      router.back();
      return;
    }

    if (!showPasswordField) {
      router.back();
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setShowPasswordField(false);
    setDeterminedType(null);
    setFormError(null);
  }

  // Fonction pour obtenir les titres selon le mode
  const getTitle = () => {
    if (mode === "signin") return "Welcome back";
    if (mode === "signup") return "Create your account";
    if (showPasswordField) {
      return determinedType === "login" ? "Welcome back" : "Create your account";
    }
    return "Sign up or log in";
  };

  const getDescription = () => {
    if (mode === "signin") return "Enter your credentials to sign in";
    if (mode === "signup") return "Create a password to get started";
    if (showPasswordField) {
      return determinedType === "login" 
        ? "Enter your password to continue" 
        : "Create a password to get started";
    }
    return "Enter your email to continue";
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="w-full">
        <CardHeader className="text-center flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl font-bold">
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-foreground/35">
              {getDescription()}
            </CardDescription>
          </div>
          {(!showPasswordField || mode !== "auto") && (
            <div className="flex gap-2 justify-center">
              <SocialButtons />
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              await handleSubmit(formData);
            }}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={(showPasswordField && mode === "auto") || isPending}
                required
              />
            </div>

            {showPasswordField && (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                    required
                  />
                </div>

                {(determinedType === "signup" || mode === "signup") && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isPending}
                      required
                    />
                  </div>
                )}
              </>
            )}

            {formError && (
              <div className="text-red-500 text-sm text-center">{formError}</div>
            )}

            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Loading..." : 
                mode === "signin" ? "Sign In" :
                mode === "signup" ? "Create Account" :
                showPasswordField 
                  ? determinedType === "login" 
                    ? "Sign In" 
                    : "Create Account"
                  : "Continue"}
            </Button>

            {(showPasswordField && mode === "auto") && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleBack}
                disabled={isPending}
                className="w-full"
              >
                Back
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
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
