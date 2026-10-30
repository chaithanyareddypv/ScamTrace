'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { ScamTraceLogo } from '@/components/brand/scamtrace-logo';
import { useToast } from '@/components/ui/toast-provider';

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'INVESTIGATOR' | 'VIEWER'>('INVESTIGATOR');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!acceptTerms) {
      setError('Please accept the Responsible Use & Security Terms.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          confirmPassword,
          acceptTerms,
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      toast({
        title: 'Account created',
        description: `Welcome to ScamTrace, ${data.user.fullName}!`,
        variant: 'success',
      });

      router.push('/app');
      router.refresh();
    } catch {
      setError('Registration service encountered an error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F7F9FC] text-[#0A2540]">
      <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white">
        <Link href="/">
          <ScamTraceLogo size="sm" showSubtitle />
        </Link>
        <Link
          href="/login"
          className="text-xs font-semibold text-[#635BFF] hover:underline"
        >
          Already registered? Sign in →
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md space-y-5">
          <div className="radar-card p-6 sm:p-8 bg-white space-y-5">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#0A2540]">
                Create Investigator Account
              </h1>
              <p className="text-xs text-slate-500">
                Join the ScamTrace Explainable Scam Investigation Platform.
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
                  htmlFor="signup-name"
                  className="block text-xs font-semibold text-[#0A2540] mb-1.5"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="signup-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Alex Rivera"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:border-[#635BFF] focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-email"
                  className="block text-xs font-semibold text-[#0A2540] mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.rivera@scamtrace.example"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:border-[#635BFF] focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="signup-role"
                  className="block text-xs font-semibold text-[#0A2540] mb-1.5"
                >
                  Workspace Role
                </label>
                <select
                  id="signup-role"
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as 'INVESTIGATOR' | 'VIEWER')
                  }
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 bg-white focus:border-[#635BFF] focus:outline-none"
                >
                  <option value="INVESTIGATOR">
                    Investigator (Analyze, Create Cases & Reports, Evidence)
                  </option>
                  <option value="VIEWER">
                    Viewer (Read-Only Audit & Sandboxed Analysis)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-xs font-semibold text-[#0A2540] mb-1.5"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars, A-z, 0-9"
                      className="w-full pl-9 pr-8 py-2 text-xs rounded-md border border-slate-300 focus:border-[#635BFF] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="signup-confirm"
                    className="block text-xs font-semibold text-[#0A2540] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="signup-confirm"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:border-[#635BFF] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-500">
                Password must be at least 8 characters and include uppercase, lowercase, and numeric characters.
              </p>

              <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#635BFF] focus:ring-[#635BFF]"
                />
                <span>
                  I accept the ScamTrace Responsible Use Policy and understand that risk scores are heuristic investigative signals.
                </span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-md bg-[#635BFF] hover:bg-[#5249E8] disabled:opacity-60 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>{loading ? 'Creating Account...' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          <div className="text-center text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-[#635BFF] hover:underline">
              Sign in here
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-slate-200/70 bg-white">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
          Passwords hashed with bcryptjs (cost factor 10).
        </span>
      </footer>
    </div>
  );
}

