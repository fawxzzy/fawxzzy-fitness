"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

const SAVED_EMAIL_KEY = "last-auth-email";

type AuthView = "chooser" | AuthMode;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserSupabase();
  const [view, setView] = useState<AuthView>("chooser");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const verified = searchParams.get("verified");
  const emailParam = searchParams.get("email");
  const infoParam = searchParams.get("info");

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(SAVED_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (emailParam) {
      setEmail((currentEmail) => (currentEmail === emailParam ? currentEmail : emailParam));
    }

    if (verified === "1") {
      setView("login");
      setInfo("Email verified. Log in to continue.");
      setError(null);
    }

    if (infoParam) {
      setInfo(infoParam);
      setError(null);
    }
  }, [emailParam, infoParam, verified]);

  useEffect(() => {
    if (!email) {
      return;
    }

    window.localStorage.setItem(SAVED_EMAIL_KEY, email);
  }, [email]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (view === "chooser") {
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    const normalizedEmail = normalizeEmail(email);

    if (view === "login") {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (loginError || !data.session) {
        setError(loginError?.message ?? "Login failed.");
        setLoading(false);
        return;
      }

      document.cookie = `sb-access-token=${data.session.access_token}; Path=/; SameSite=Lax`;
      router.push("/today");
      router.refresh();
      return;
    }

    const { data, error: signupError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/confirm?email=${encodeURIComponent(normalizedEmail)}`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      document.cookie = `sb-access-token=${data.session.access_token}; Path=/; SameSite=Lax`;
      router.push("/today");
      router.refresh();
      return;
    }

    setInfo("Account created. Check your email to confirm your account, then log in.");
    setPassword("");
    setView("login");
    setLoading(false);
  };

  const onForgotPassword = async () => {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError("Enter your email first so we can send a reset link.");
      return;
    }

    setSendingReset(true);
    setError(null);
    setInfo(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/auth/confirm?email=${encodeURIComponent(normalizedEmail)}`,
    });

    if (resetError) {
      setError(resetError.message);
      setSendingReset(false);
      return;
    }

    setInfo("Password reset email sent. Check your inbox for the secure reset link.");
    setSendingReset(false);
  };

  if (view === "chooser") {
    return (
      <div className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Welcome</h1>
        <p className="text-sm text-slate-600">Choose how you want to continue.</p>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setInfo(null);
            setPassword("");
            setView("login");
          }}
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-white"
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setInfo(null);
            setPassword("");
            setView("signup");
          }}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
        >
          Sign up
        </button>
      </div>
    );
  }

  const heading = view === "login" ? "Log in" : "Sign up";
  const emailLabel = view === "login" ? "Email" : "Create email";
  const passwordLabel = view === "login" ? "Password" : "Create password";

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{heading}</h1>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setInfo(null);
            setPassword("");
            setView("chooser");
          }}
          className="text-sm text-slate-600 underline"
        >
          Back
        </button>
      </div>
      <div>
        <label className="mb-1 block text-sm">{emailLabel}</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          autoComplete="email"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm">{passwordLabel}</label>
        <input
          type="password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2"
          autoComplete={view === "login" ? "current-password" : "new-password"}
        />
      </div>
      {view === "login" ? (
        <button
          type="button"
          disabled={sendingReset || loading}
          onClick={onForgotPassword}
          className="text-left text-sm text-slate-700 underline disabled:opacity-70"
        >
          {sendingReset ? "Sending reset link..." : "Forgot password? Send reset link"}
        </button>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-white disabled:opacity-70"
      >
        {loading
          ? view === "login"
            ? "Logging in..."
            : "Creating account..."
          : view === "login"
            ? "Log in"
            : "Sign up"}
      </button>
    </form>
  );
}
