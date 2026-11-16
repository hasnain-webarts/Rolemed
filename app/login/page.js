"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Stethoscope, Lock, Mail, ChevronRight, Activity, ShieldAlert, KeyRound, Eye, EyeOff, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { signIn } from 'next-auth/react';

const DEMO_ACCOUNTS = [
  { role: 'doctor', title: 'Doctor', email: 'doctor@rolemed.org', desc: 'Cardiology & Notes' },
  { role: 'admin', title: 'Admin', email: 'admin@rolemed.org', desc: 'Hospital Oversight' },
  { role: 'receptionist', title: 'Receptionist', email: 'receptionist@rolemed.org', desc: 'Intake & Queue' },
  { role: 'pharmacist', title: 'Pharmacist', email: 'pharmacist@rolemed.org', desc: 'Dispensary & Stock' },
  { role: 'lab-technician', title: 'Lab Tech', email: 'lab@rolemed.org', desc: 'Pathology Reports' },
  { role: 'patient', title: 'Patient', email: 'patient@rolemed.org', desc: 'Patient Portal' },
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('doctor'); // 'admin' | 'doctor' | 'receptionist' | 'lab-technician' | 'pharmacist'
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fillDemoCredentials = (demo) => {
    setRole(demo.role);
    setEmail(demo.email);
    setPassword('password123');
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your hospital email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await signIn('credentials', {
        email: email.trim(),
        password,
        role,
        redirect: false,
      });

      if (res?.error) {
        setLoading(false);
        setErrorMsg(res.error || 'Authentication failed. Please verify your credentials.');
      } else {
        // Successful login: redirect to the respective role dashboard
        router.push(`/dashboard/${role}`);
        router.refresh();
      }
    } catch (err) {
      setLoading(false);
      setErrorMsg('An unexpected hospital network or authorization error occurred.');
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-[80px] min-h-[calc(100vh-80px)] flex bg-[#f1faff]">
        {/* Left column branding card (hidden on mobile) */}
        <section className="hidden lg:flex lg:w-1/2 bg-primary text-on-primary flex-col justify-between p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-90 z-0"></div>
          
          {/* Subtle grid line backdrop */}
          <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] z-0"></div>
          
          <div className="relative z-10 space-y-md">
            <h1 className="font-headline-md text-headline-md font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="animate-pulse" /> RB-HMS Systems
            </h1>
            <p className="text-body-md opacity-90 font-medium">Role-Based Hospital Management Platform</p>
          </div>

          <div className="relative z-10 space-y-lg">
            <h2 className="text-display-lg font-bold leading-tight max-w-[450px]">Clinical Excellence through Precision.</h2>
            <p className="text-body-md text-primary-fixed-dim leading-relaxed max-w-[380px]">
              Digitizing front desk schedules, electronic health records, lab path-findings, and pharmacy inventory under a secure role-based framework.
            </p>
          </div>

          <div className="relative z-10 border-t border-white/20 pt-lg text-xs opacity-75">
            © {new Date().getFullYear()} RoleMed RB-HMS Inc. All privileges permissioned.
          </div>
        </section>

        {/* Right column form */}
        <section className="w-full lg:w-1/2 flex items-center justify-center p-md py-10">
          <div className="max-w-[480px] w-full glass-card p-6 md:p-8 rounded-[24px] clinical-shadow border border-outline-variant/30 space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-title-sm font-bold text-on-surface">Staff Portal Access</h3>
                <span className="text-[11px] font-bold text-primary bg-primary-fixed px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  RBAC Secure
                </span>
              </div>
              <p className="text-body-sm text-outline mt-1">Select your designated medical role to access your dashboard.</p>
            </div>

            {/* Quick Demo Role Switcher */}
            <div className="p-3 bg-surface-container/30 rounded-2xl border border-outline-variant/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                <Sparkles size={12} className="text-primary" /> 1-Click Demo Staff Switcher
              </span>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {DEMO_ACCOUNTS.map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => fillDemoCredentials(demo)}
                    className={`cursor-pointer p-2 rounded-xl text-center transition-all ${
                      role === demo.role && email === demo.email
                        ? 'bg-primary text-white clinical-shadow scale-[1.02]'
                        : 'bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/20 text-on-surface'
                    }`}
                    title={`${demo.title}: ${demo.email}`}
                  >
                    <span className="block text-[11px] font-bold truncate">{demo.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-error-container text-on-error-container flex items-start gap-2.5 text-xs font-semibold animate-fade-in border border-error/20">
                <ShieldAlert size={16} className="text-error shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4 text-body-sm">
              <div>
                <label className="block text-outline mb-1 font-semibold text-xs">Select Assigned Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full p-2.5 border border-outline-variant/40 rounded-xl bg-surface-container-lowest text-body-sm font-bold text-primary focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="admin">System Administrator</option>
                  <option value="doctor">Medical Practitioner (Doctor)</option>
                  <option value="receptionist">Front Desk Supervisor (Receptionist)</option>
                  <option value="lab-technician">Laboratory Pathologist (Technician)</option>
                  <option value="pharmacist">Pharmacy Dispenser (Pharmacist)</option>
                  <option value="patient">Patient (Patient Portal)</option>
                </select>
              </div>

              <div>
                <label className="block text-outline mb-1 font-semibold text-xs">Hospital Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                  <input
                    type="email"
                    required
                    placeholder="name@rolemed.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-outline mb-1 font-semibold text-xs">Access Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface cursor-pointer p-1"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl font-bold clinical-shadow hover:opacity-90 disabled:opacity-50 transition-all text-body-sm mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Verifying Credentials...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard <ChevronRight size={16} />
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-body-sm text-outline border-t border-outline-variant/20 text-xs">
              New staff member?{' '}
              <Link href="/signup" className="text-primary font-bold hover:underline">
                Request Profile Activation
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
