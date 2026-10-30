'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { ScamTraceLogo } from '@/components/brand/scamtrace-logo';
import { useToast } from '@/components/ui/toast-provider';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState('admin@scamtrace.example');
  const [password, setPassword] = useState('ScamTrace@Admin2026');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      toast({
        title: `Welcome back, ${data.user.fullName}`,
        description: `Signed in as ${data.user.role}.`,
        variant: 'success',
      });

      router.push('/app');
      router.refresh();
    } catch {
      setError('Unable to reach authentication server. Please try again.');
      setLoading(false);
    }
  };

  const fillDemoAccount = (
    demoEmail: string,
    demoPass: string
  ) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F9FC] text-[#0A2540]">
      <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white">
        <Link href="/">
          <ScamTraceLogo size="sm" showSubtitle />
        </Link>
        <Link
          href="/signup"
          className="text-xs font-semibold text-[#635BFF] hover:underline"
        >
          Need an account? Sign up →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-5">
          <div className="radar-card p-6 sm:p-8 bg-white space-y-6">
            <div className="space-y-1.5">
              <h1 className="text-xl font-bold text-[#0A2540]">
                Sign in to ScamTrace
              </h1>
              <p className="text-xs text-slate-500">
                Access the Explainable Digital Scam Investigation Workspace.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-[#0A2540] mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@scamtrace.example"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:border-[#635BFF] focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#0A2540] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-9 py-2 text-xs rounded-md border border-slate-300 focus:border-[#635BFF] focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#635BFF] focus:ring-[#635BFF]"
                  />
                  <span>Remember session (30 days)</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md bg-[#635BFF] hover:bg-[#5249E8] disabled:opacity-60 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* One-Click Demo Credentials Box */}
            <div className="pt-4 border-t border-slate-200/80 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <KeyRound className="w-3.5 h-3.5 text-[#635BFF]" />
                <span>Quick-Fill Role-Based Demo Accounts</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {[
                  {
                    role: 'Administrator',
                    email: 'admin@scamtrace.example',
                    pass: 'ScamTrace@Admin2026',
                    desc: 'Full access: Rules, Users, Cases, Exports',
                  },
                  {
                    role: 'Investigator',
                    email: 'investigator@scamtrace.example',
                    pass: 'ScamTrace@Investigator2026',
                    desc: 'Case triage, Evidence Vault, Analysis, Exports',
                  },
                  {
                    role: 'Viewer',
                    email: 'viewer@scamtrace.example',
                    pass: 'ScamTrace@Viewer2026',
                    desc: 'Read-only audit + Sandboxed Analysis',
                  },
                ].map((acct) => (
                  <button
                    key={acct.role}
                    type="button"
                    onClick={() => fillDemoAccount(acct.email, acct.pass)}
                    className="text-left p-2.5 rounded-md border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#0A2540]">
                        {acct.role}{' '}
                        <span className="font-mono font-normal text-slate-500">
                          ({acct.email})
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">{acct.desc}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-[#635BFF] shrink-0 ml-2">
                      Use →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center text-xs text-slate-500">
            Don&apos;t have an investigator account?{' '}
            <Link href="/signup" className="font-semibold text-[#635BFF] hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200/70 bg-white">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          Protected by HTTP-only signed session cookies & server-side RBAC.
        </span>
      </footer>
    </div>
  );
}

