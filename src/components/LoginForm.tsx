"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

const SAVED_EMAIL_KEY = "last-auth-email";

type AuthView = "chooser" | AuthMode;

export function LoginForm() {
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [view, setView] = useState<AuthView>("chooser");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(SAVED_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

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

    if (view === "login") {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
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
      email,
      password,
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
    setView("login");
    setLoading(false);
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
