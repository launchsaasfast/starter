"use client";
import { useState } from "react";
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
import { Eye, EyeOff, Mail, Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { auth2FAApi } from "@/utils/api";
import { QRCodeDisplay } from "@/components/auth/qr-code-display";
import { BackupCodesModal } from "@/components/auth/backup-codes-modal";
import { TwoFactorInput } from "@/components/auth/two-factor-input";

// Schémas de validation
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

type AuthState = "email" | "password" | "setup2FA" | "verify2FA" | "showBackupCodes";

export function AuthFormAdvanced({
  mode = "auto",
  nextUrl = "/settings",
  initialEmail = null,
}: AuthFormProps) {
  const router = useRouter();
  
  // États principaux
  const [authState, setAuthState] = useState<AuthState>(mode === "auto" ? "email" : "password");
  const [determinedType, setDeterminedType] = useState<"login" | "signup" | null>(
    mode === "auto" ? null : mode === "signin" ? "login" : "signup"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);

  // États 2FA
  const [totpSecret, setTotpSecret] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);

  // Formes
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: initialEmail || "" },
  });

  const signinForm = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: { email: initialEmail || "", password: "" },
  });

  const signupForm = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: initialEmail || "", password: "", confirmPassword: "" },
  });

  // Gestion de l'email check (mode auto)
  async function handleEmailCheck(email: string) {
    try {
      setIsPending(true);
      // Pour l'instant, on suppose nouveau signup - sera amélioré avec checkEmail API
      setDeterminedType("signup");
      setAuthState("password");
      signupForm.setValue("email", email);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    } finally {
      setIsPending(false);
    }
  }

  // Soumission email
  async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
    await handleEmailCheck(values.email);
  }

  // Soumission signin avec vérification 2FA
  async function onSigninSubmit(values: z.infer<typeof signinSchema>) {
    try {
      setIsPending(true);
      const result = await api.auth.login(values.email, values.password);
      
      if (result.success) {
        // Vérifier si 2FA est requis
        const mfaStatus = await auth2FAApi.getStatus();
        
        if (mfaStatus.enabled) {
          // Rediriger vers verification 2FA
          setAuthState("verify2FA");
          toast.info("Please enter your 2FA code to complete login");
        } else {
          // Connexion réussie sans 2FA
          toast.success("Successfully signed in!");
          router.push(nextUrl);
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign in failed");
    } finally {
      setIsPending(false);
    }
  }

  // Soumission signup avec setup 2FA
  async function onSignupSubmit(values: z.infer<typeof signupSchema>) {
    try {
      setIsPending(true);
      const result = await api.auth.signup(values.email, values.password);
      
      if (result.success) {
        // Proposer setup 2FA après inscription réussie
        setAuthState("setup2FA");
        toast.success("Account created! Let's secure it with 2FA");
        
        // Initier setup 2FA
        const setupData = await auth2FAApi.setup();
        setTotpSecret(setupData.secret);
        setQrCodeUrl(setupData.qrCodeUrl);
        setBackupCodes(setupData.backupCodes);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign up failed");
    } finally {
      setIsPending(false);
    }
  }

  // Finaliser setup 2FA
  async function handle2FASetupComplete(code: string) {
    try {
      setIsPending(true);
      const result = await auth2FAApi.verify(code, 'totp');
      
      if (result.success) {
        setAuthState("showBackupCodes");
        setShowBackupCodesModal(true);
        toast.success("2FA setup completed successfully!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "2FA verification failed");
    } finally {
      setIsPending(false);
    }
  }

  // Vérification 2FA lors du login
  async function handle2FAVerification(code: string, type: 'totp' | 'backup' = 'totp') {
    try {
      setIsPending(true);
      const result = await auth2FAApi.verify(code, type);
      
      if (result.success) {
        toast.success("2FA verification successful!");
        router.push(nextUrl);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "2FA verification failed");
    } finally {
      setIsPending(false);
    }
  }

  // Ignorer setup 2FA et continuer
  function skip2FASetup() {
    toast.info("You can setup 2FA later in security settings");
    router.push(nextUrl);
  }

  // Finaliser après sauvegarde backup codes
  function handleBackupCodesSaved() {
    setShowBackupCodesModal(false);
    toast.success("Welcome! Your account is now secured with 2FA");
    router.push(nextUrl);
  }

  function handleBack() {
    if (authState === "setup2FA" || authState === "verify2FA") {
      setAuthState("password");
      return;
    }
    
    if (authState === "password" && mode === "auto") {
      setAuthState("email");
      setDeterminedType(null);
      return;
    }
    
    router.back();
  }

  // Titres et descriptions dynamiques
  const getTitle = () => {
    switch (authState) {
      case "setup2FA":
        return "Secure your account";
      case "verify2FA":
        return "Two-factor authentication";
      case "showBackupCodes":
        return "Save backup codes";
      case "password":
        if (mode === "signin") return "Welcome back";
        if (mode === "signup") return "Create your account";
        return determinedType === "login" ? "Welcome back" : "Create your account";
      default:
        return "Sign up or log in";
    }
  };

  const getDescription = () => {
    switch (authState) {
      case "setup2FA":
        return "Scan the QR code with your authenticator app";
      case "verify2FA":
        return "Enter the code from your authenticator app";
      case "showBackupCodes":
        return "Save these codes in a secure location";
      case "password":
        if (mode === "signin") return "Enter your credentials to sign in";
        if (mode === "signup") return "Create a password to get started";
        return determinedType === "login" 
          ? "Enter your password to continue" 
          : "Create a password to get started";
      default:
        return "Enter your email to continue";
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="w-full bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl border-0">
        <CardHeader className="space-y-4 pb-8">
          <div className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
              {(authState === "setup2FA" || authState === "verify2FA") && (
                <Shield className="h-6 w-6 text-blue-600" />
              )}
              {getTitle()}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {getDescription()}
            </CardDescription>
          </div>
          
          {/* Boutons sociaux - seulement pour les étapes initiales */}
          {authState === "email" || (authState === "password" && mode !== "auto") && (
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
          {/* Formulaire email (mode auto) */}
          {authState === "email" && (
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
                <Button type="submit" className="w-full h-11" disabled={isPending}>
                  {isPending ? "Checking..." : "Continue"}
                </Button>
              </form>
            </Form>
          )}

          {/* Formulaire signin */}
          {authState === "password" && (mode === "signin" || determinedType === "login") && (
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
                          disabled={mode === "auto"}
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
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-11" disabled={isPending}>
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
          {authState === "password" && (mode === "signup" || determinedType === "signup") && (
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
                          disabled={mode === "auto"}
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
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full h-11" disabled={isPending}>
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

          {/* Setup 2FA */}
          {authState === "setup2FA" && (
            <div className="space-y-6">
              <QRCodeDisplay
                secret={totpSecret}
                qrCodeUrl={qrCodeUrl}
                email={signupForm.getValues("email")}
              />
              
              <TwoFactorInput
                onVerify={handle2FASetupComplete}
                onBackupCode={() => {}} // Pas encore de backup codes à ce stade
                showBackupOption={false}
                isPending={isPending}
                placeholder="Enter the 6-digit code from your app"
              />

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={skip2FASetup}
                  className="flex-1 h-11"
                  disabled={isPending}
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  className="h-11 px-6"
                  disabled={isPending}
                >
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Verification 2FA */}
          {authState === "verify2FA" && (
            <div className="space-y-6">
              <TwoFactorInput
                onVerify={handle2FAVerification}
                onBackupCode={(code) => handle2FAVerification(code, 'backup')}
                showBackupOption={true}
                isPending={isPending}
                placeholder="Enter your 6-digit authenticator code"
              />

              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="w-full h-11"
                disabled={isPending}
              >
                Back to login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal pour backup codes */}
      <BackupCodesModal
        isOpen={showBackupCodesModal}
        onClose={() => setShowBackupCodesModal(false)}
        backupCodes={backupCodes}
        onSaved={handleBackupCodesSaved}
      />
    </div>
  );
}

export function SocialButtons() {
  const [isPending, setIsPending] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setIsPending(true);
      toast.success("Redirecting to Google...");
    } catch {
      toast.error("Failed to sign in with Google");
    } finally {
      setIsPending(false);
    }
  }

  async function handleGithubSignIn() {
    try {
      setIsPending(true);
      toast.success("Redirecting to GitHub...");
    } catch {
      toast.error("Failed to sign in with GitHub");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button 
        variant="outline" 
        className="h-11 flex items-center justify-center gap-2 font-medium" 
        onClick={handleGoogleSignIn} 
        disabled={isPending}
      >
        <FaGoogle className="h-4 w-4" />
        Google
      </Button>
      <Button 
        variant="outline" 
        className="h-11 flex items-center justify-center gap-2 font-medium" 
        onClick={handleGithubSignIn} 
        disabled={isPending}
      >
        <FaGithub className="h-4 w-4" />
        GitHub
      </Button>
    </>
  );
}
