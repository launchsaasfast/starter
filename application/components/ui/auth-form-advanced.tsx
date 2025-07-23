"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { validatePassword, validateEmail } from "@/validation/auth-validation";
import { AUTH_CONFIG } from "@/config/auth";
import { api } from "@/utils/api";

// Schémas de validation avec Zod
const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type AuthFormProps = {
  mode?: "signin" | "signup" | "auto";
  nextUrl?: string;
  initialEmail?: string | null;
};

export function AuthFormAdvanced({
  mode = "auto",
  nextUrl = "/dashboard",
  initialEmail = null,
}: AuthFormProps) {
  const router = useRouter();
  
  const [showPasswordField, setShowPasswordField] = useState(mode !== "auto");
  const [determinedType, setDeterminedType] = useState<"login" | "signup" | null>(
    mode === "auto" ? null : mode === "signin" ? "login" : "signup"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // Forme pour l'étape email (mode auto)
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: initialEmail || "",
    },
  });

  // Forme pour signin
  const signinForm = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: initialEmail || "",
      password: "",
    },
  });

  // Forme pour signup
  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: initialEmail || "",
      password: "",
      confirmPassword: "",
    },
  });

  // Gestion de la vérification d'email pour le mode auto
  async function handleEmailCheck(email: string) {
    try {
      setIsPending(true);
      const data = await api.auth.checkEmail(email);
      setDeterminedType(data.exists ? "login" : "signup");
      setShowPasswordField(true);
      
      // Pré-remplir le bon formulaire
      if (data.exists) {
        signinForm.setValue("email", email);
      } else {
        signupForm.setValue("email", email);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  }

  // Soumission du formulaire email (mode auto)
  async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
    await handleEmailCheck(values.email);
  }

  // Soumission du formulaire signin
  async function onSigninSubmit(values: z.infer<typeof signinSchema>) {
    try {
      setIsPending(true);
      const result = await api.auth.login(values);
      if (result) {
        toast.success("Successfully signed in!");
        router.push(nextUrl);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setIsPending(false);
    }
  }

  // Soumission du formulaire signup
  async function onSignupSubmit(values: z.infer<typeof signupSchema>) {
    try {
      setIsPending(true);
      await api.auth.signup({
        email: values.email,
        password: values.password,
      });
      toast.success("Account created successfully!");
      router.push(nextUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign up failed");
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

    setShowPasswordField(false);
    setDeterminedType(null);
    emailForm.reset();
    signinForm.reset();
    signupForm.reset();
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
      <Card className="w-full bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl border-0">
        <CardHeader className="space-y-4 pb-8">
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {getDescription()}
            </CardDescription>
          </div>
          
          {/* Boutons sociaux */}
          {(!showPasswordField || mode !== "auto") && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <SocialButtons />
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Formulaire email pour mode auto */}
          {mode === "auto" && !showPasswordField && (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-11" 
                  disabled={isPending}
                >
                  {isPending ? "Checking..." : "Continue"}
                </Button>
              </form>
            </Form>
          )}

          {/* Formulaire signin */}
          {(mode === "signin" || (mode === "auto" && showPasswordField && determinedType === "login")) && (
            <Form {...signinForm}>
              <form onSubmit={signinForm.handleSubmit(onSigninSubmit)} className="space-y-4">
                <FormField
                  control={signinForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          className="h-11"
                          disabled={mode === "auto" && showPasswordField}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signinForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            className="h-11 pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-11" 
                  disabled={isPending}
                >
                  {isPending ? "Signing in..." : "Sign In"}
                </Button>
                {mode === "auto" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="w-full h-11"
                    disabled={isPending}
                  >
                    Back
                  </Button>
                )}
              </form>
            </Form>
          )}

          {/* Formulaire signup */}
          {(mode === "signup" || (mode === "auto" && showPasswordField && determinedType === "signup")) && (
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} className="space-y-4">
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          className="h-11"
                          disabled={mode === "auto" && showPasswordField}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a password"
                            className="h-11 pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="h-11 pr-10"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full h-11" 
                  disabled={isPending}
                >
                  {isPending ? "Creating account..." : "Create Account"}
                </Button>
                {mode === "auto" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    className="w-full h-11"
                    disabled={isPending}
                  >
                    Back
                  </Button>
                )}
              </form>
            </Form>
          )}
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
    } catch (error) {
      toast.error("Failed to sign in with Google");
    } finally {
      setIsPending(false);
    }
  }

  async function handleGithubSignIn() {
    try {
      setIsPending(true);
      const data = await api.auth.githubSignIn();
      if (data.url) window.location.href = data.url;
    } catch (error) {
      toast.error("Failed to sign in with GitHub");
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
    <>
      {AUTH_CONFIG.socialProviders.google.enabled && (
        <Button 
          variant="outline" 
          className="h-11 flex items-center justify-center gap-2 font-medium" 
          onClick={handleGoogleSignIn} 
          disabled={isPending}
        >
          <FaGoogle className="h-4 w-4" />
          Google
        </Button>
      )}
      {AUTH_CONFIG.socialProviders.github.enabled && (
        <Button 
          variant="outline" 
          className="h-11 flex items-center justify-center gap-2 font-medium" 
          onClick={handleGithubSignIn} 
          disabled={isPending}
        >
          <FaGithub className="h-4 w-4" />
          GitHub
        </Button>
      )}
    </>
  );
}
