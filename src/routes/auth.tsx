import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  resetPasswordWithMobileOtp,
  requestPasswordResetOtpByMobile,
  supabase,
} from "@/integrations/supabase/client";
import { isPatientOnly } from "@/lib/roles";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Staff & Patient Sign In | Bhagwati Smart Hospital ERP" },
      {
        name: "description",
        content:
          "Secure sign in for Bhagwati Hospital Daltonganj staff and patients. Role-based access with full audit logging.",
      },
      { property: "og:title", content: "Sign In | Bhagwati Smart Hospital ERP" },
      {
        property: "og:description",
        content: "Secure role-based access to the Bhagwati Hospital platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const staffCredentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const patientSignInSchema = z.object({
  mobile: z.string().trim().min(10, "Enter a valid mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const patientSignUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  mobile: z.string().trim().min(10, "Enter a valid mobile number"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const resetSchema = z.object({
  mobile: z.string().trim().min(10, "Enter a valid mobile number"),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function normalizeMobile(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  return null;
}

function AuthPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"signin" | "signup" | "reset">("signin");
  const [loading, setLoading] = useState(false);
  const [signInMode, setSignInMode] = useState<"mobile" | "email">("mobile");
  const [signInMobile, setSignInMobile] = useState("");
  const [signInEmail, setSignInEmail] = useState("");
  const [signUpMobile, setSignUpMobile] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [resetMobile, setResetMobile] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const login = params.get("login");
    if (login === "staff") setSignInMode("email");
    if (login === "patient") setSignInMode("mobile");
  }, []);

  async function resolveLandingPath(userId: string): Promise<"/portal" | "/dashboard"> {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roleList = (roles ?? []).map((row) => row.role);
    return isPatientOnly(roleList) || roleList.length === 0 ? "/portal" : "/dashboard";
  }

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      void resolveLandingPath(data.session.user.id).then((to) => {
        void navigate({ to });
      });
    });
  }, [navigate]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();

    let authIdentifier = "";
    if (signInMode === "mobile") {
      const parsed = patientSignInSchema.safeParse({ mobile: signInMobile, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]!.message);
        return;
      }
      const normalized = normalizeMobile(parsed.data.mobile);
      if (!normalized) {
        toast.error("Enter a valid 10-digit mobile number");
        return;
      }
      authIdentifier = normalized;
    } else {
      const parsed = staffCredentialsSchema.safeParse({ email: signInEmail, password });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0]!.message);
        return;
      }
      authIdentifier = parsed.data.email;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: authIdentifier,
      password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Signed in securely");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const to = await resolveLandingPath(auth.user.id);
    void navigate({ to });
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    const parsed = patientSignUpSchema.safeParse({
      fullName,
      mobile: signUpMobile,
      password,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }

    const normalized = normalizeMobile(parsed.data.mobile);
    if (!normalized) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: `m${normalized}@patient.local`,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.fullName, mobile: normalized },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Account created. Check your email to confirm before signing in.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const to = await resolveLandingPath(auth.user.id);
    void navigate({ to });
  }

  async function handleSendOtp() {
    const normalized = normalizeMobile(resetMobile);
    if (!normalized) {
      toast.error("Enter a valid 10-digit mobile number");
      return;
    }

    setOtpSending(true);
    const result = requestPasswordResetOtpByMobile(normalized);
    setOtpSending(false);

    if (!result.ok) {
      toast.error(result.error || "Unable to send OTP");
      return;
    }

    const smsResponse = await fetch("/api/sms/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile: normalized, otp: result.otp }),
    });

    const sms = (await smsResponse.json().catch(() => null)) as
      | { ok?: boolean; error?: string; notConfigured?: boolean }
      | null;

    if (sms?.ok) {
      toast.success("OTP sent successfully to your mobile");
      return;
    }

    if (sms?.notConfigured) {
      toast.warning(`SMS not configured. Demo OTP: ${result.otp}`);
      return;
    }

    const reason = sms?.error || `HTTP ${smsResponse.status}`;
    toast.error(`Failed to send SMS OTP: ${reason}. Use demo OTP: ${result.otp}`);
  }

  async function handleResetPassword(event: React.FormEvent) {
    event.preventDefault();
    const parsed = resetSchema.safeParse({
      mobile: resetMobile,
      otp: resetOtp,
      newPassword: resetNewPassword,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]!.message);
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      toast.error("Confirm password does not match");
      return;
    }

    setResettingPassword(true);
    const result = resetPasswordWithMobileOtp({
      mobile: parsed.data.mobile,
      otp: parsed.data.otp,
      newPassword: parsed.data.newPassword,
    });
    setResettingPassword(false);

    if (!result.ok) {
      toast.error(result.error || "Unable to reset password");
      return;
    }

    toast.success("Password reset successful. Please sign in.");
    setResetOtp("");
    setResetNewPassword("");
    setResetConfirmPassword("");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between brand-gradient p-12 text-primary-foreground lg:flex">
        <BrandMark />
        <div className="max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight">
            One Hospital.
            <br />
            One Secure Platform.
          </h1>
          <p className="mt-4 text-sm opacity-90">
            ERP, EMR and CRM for Bhagwati Hospital, Daltonganj — registration, OPD queues,
            pathology, billing, follow-ups and the patient portal on a single audited backend.
          </p>
          <p className="mt-2 text-xs opacity-80">
            Separate workspaces for hospital staff and patients. One shared data spine keeps both in sync.
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs opacity-80">
          <ShieldCheck className="size-4" /> Every action is written to an append-only audit trail.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="neo w-full max-w-md p-8">
          <div className="mb-6 lg:hidden">
            <BrandMark />
          </div>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "signin" | "signup" | "reset")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
              <TabsTrigger value="reset">Reset Password</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form className="space-y-4 pt-4" onSubmit={handleSignIn}>
                <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1">
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      signInMode === "mobile" ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                    onClick={() => setSignInMode("mobile")}
                  >
                    Patient mobile
                  </button>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1.5 text-sm ${
                      signInMode === "email" ? "bg-background shadow-sm" : "text-muted-foreground"
                    }`}
                    onClick={() => setSignInMode("email")}
                  >
                    Staff email
                  </button>
                </div>

                {signInMode === "mobile" ? (
                  <div className="space-y-2">
                    <Label htmlFor="signin-mobile">Mobile number</Label>
                    <Input
                      id="signin-mobile"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={signInMobile}
                      onChange={(e) => setSignInMobile(e.target.value)}
                      placeholder="10-digit mobile"
                    />
                  </div>
                ) : (
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    autoComplete="email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="you@bhagwatihospital.in"
                  />
                </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="space-y-4 pt-4" onSubmit={handleSignUp}>
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full name</Label>
                  <Input
                    id="signup-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Rahul Kumar"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-mobile">Mobile number</Label>
                  <Input
                    id="signup-mobile"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={signUpMobile}
                    onChange={(e) => setSignUpMobile(e.target.value)}
                    placeholder="10-digit mobile"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />} Create account
                </Button>
                <p className="text-xs text-muted-foreground">
                  Patient registration is mobile-first. Staff roles continue to be controlled by
                  the Administration module.
                </p>
                <p className="text-xs text-muted-foreground">
                  If the hospital already registered your profile, use the same mobile number to
                  link and access your existing record.
                </p>
              </form>
            </TabsContent>

            <TabsContent value="reset">
              <form className="space-y-4 pt-4" onSubmit={handleResetPassword}>
                <div className="space-y-2">
                  <Label htmlFor="reset-mobile">Registered mobile number</Label>
                  <Input
                    id="reset-mobile"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={resetMobile}
                    onChange={(e) => setResetMobile(e.target.value)}
                    placeholder="10-digit mobile"
                  />
                </div>

                <Button type="button" variant="outline" className="w-full" onClick={handleSendOtp} disabled={otpSending}>
                  {otpSending && <Loader2 className="size-4 animate-spin" />} Send OTP
                </Button>

                <div className="space-y-2">
                  <Label htmlFor="reset-otp">OTP</Label>
                  <Input
                    id="reset-otp"
                    type="tel"
                    inputMode="numeric"
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value)}
                    placeholder="6-digit OTP"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-new-password">New password</Label>
                  <Input
                    id="reset-new-password"
                    type="password"
                    autoComplete="new-password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reset-confirm-password">Confirm new password</Label>
                  <Input
                    id="reset-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={resettingPassword}>
                  {resettingPassword && <Loader2 className="size-4 animate-spin" />} Reset password
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}