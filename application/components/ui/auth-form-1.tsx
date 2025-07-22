"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Separator } from "./separator";
import { Checkbox } from "./checkbox";
import { cn } from "@/lib/utils";

// --------------------------------
// Types and Enums
// --------------------------------

enum AuthView {
  SIGN_IN = "sign-in",
  SIGN_UP = "sign-up",
  FORGOT_PASSWORD = "forgot-password",
  RESET_SUCCESS = "reset-success",
}

interface AuthState {
  view: AuthView;
}

interface FormState {
  isLoading: boolean;
  error: string | null;
  showPassword: boolean;
}

// --------------------------------
// Schemas
// --------------------------------

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  terms: z.boolean().refine(val => val === true, { message: "You must agree to the terms" }),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type SignInFormValues = z.infer<typeof signInSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// --------------------------------
// Main Auth Component
// --------------------------------

export function Auth({ className, ...props }: React.ComponentProps<"div">) {
  const [state, setState] = React.useState<AuthState>({ view: AuthView.SIGN_IN });
  const setView = React.useCallback((view: AuthView) => setState({ view }), []);

  return (
    <div data-slot="auth" className={cn("mx-auto w-full max-w-md", className)} {...props}>
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {state.view === AuthView.SIGN_IN && (
              <AuthSignIn
                key="sign-in"
                onForgotPassword={() => setView(AuthView.FORGOT_PASSWORD)}
                onSignUp={() => setView(AuthView.SIGN_UP)}
              />
            )}
            {state.view === AuthView.SIGN_UP && (
              <AuthSignUp key="sign-up" onSignIn={() => setView(AuthView.SIGN_IN)} />
            )}
            {state.view === AuthView.FORGOT_PASSWORD && (
              <AuthForgotPassword
                key="forgot-password"
                onSignIn={() => setView(AuthView.SIGN_IN)}
                onSuccess={() => setView(AuthView.RESET_SUCCESS)}
              />
            )}
            {state.view === AuthView.RESET_SUCCESS && (
              <AuthResetSuccess key="reset-success" onSignIn={() => setView(AuthView.SIGN_IN)} />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// --------------------------------
// Shared Components
// --------------------------------

interface AuthFormProps<T> {
  onSubmit: (data: T) => Promise<void>;
  children: React.ReactNode;
  className?: string;
}

function AuthForm<T>({ onSubmit, children, className }: AuthFormProps<T>) {
  return (
    <form onSubmit={onSubmit as any} data-slot="auth-form" className={cn("space-y-6", className)}>
      {children}
    </form>
  );
}

interface AuthErrorProps {
  message: string | null;
}

function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;
  return (
    <div data-slot="auth-error" className="mb-6 animate-in rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

interface AuthSocialButtonsProps {
  isLoading: boolean;
}

function AuthSocialButtons({ isLoading }: AuthSocialButtonsProps) {
  return (
    <div data-slot="auth-social-buttons" className="w-full mt-6">
      {/* social button code */}
    </div>
  );
}

interface AuthSeparatorProps {
  text?: string;
}

function AuthSeparator({ text = "Or continue with" }: AuthSeparatorProps) {
  return (
    <div data-slot="auth-separator" className="relative mt-6">
      <div className="absolute inset-0 flex items-center">
        <Separator />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

// --------------------------------
// Sign In Component
// --------------------------------

interface AuthSignInProps {
  onForgotPassword: () => void;
  onSignUp: () => void;
}

function AuthSignIn({ onForgotPassword, onSignUp }: AuthSignInProps) {
  const [formState, setFormState] = React.useState<FormState>({ isLoading: false, error: null, showPassword: false });
  const { register, handleSubmit, formState: { errors } } = useForm<SignInFormValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (data: SignInFormValues) => {
    // sign-in logic
  };

  return (
    <motion.div data-slot="auth-sign-in" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="p-8">
      {/* ... */}
    </motion.div>
  );
}

// Stub subcomponents to satisfy references
const AuthSignUp: React.FC<{ onSignIn: () => void }> = () => null;
const AuthForgotPassword: React.FC<{ onSignIn: () => void; onSuccess: () => void }> = () => null;
const AuthResetSuccess: React.FC<{ onSignIn: () => void }> = () => null;

