import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  User,
  AlertCircle,
  ShieldCheck,
  FlaskConical,
  Eye,
  EyeOff,
  Terminal,
  Shield,
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('labtech1');
  const [password, setPassword] = useState('TechPassword123!');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || 'Login failed. Check server connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fillQuickLogin = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-[#0b1326] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background ambient radial gradients */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
        <div className="w-[720px] h-[720px] rounded-full bg-sky-500/5 blur-[120px] -top-32" />
        <div className="w-[480px] h-[480px] rounded-full bg-emerald-500/5 blur-[100px] -bottom-20" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Main Card */}
        <div className="bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 bg-[#131b2e] border-b border-[#334155] flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-950/50 border border-sky-400/30 mb-3">
              <FlaskConical className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-100 tracking-tight">LabTrack LIMS</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Diagnostic Laboratory Information Management System
            </p>

            <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1 bg-[#171f33] border border-[#334155] rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-mono text-slate-300 uppercase tracking-tight">
                Station: <span className="text-emerald-400 font-semibold">ONLINE NODE</span>
              </span>
            </div>
          </div>

          {/* Error notification */}
          {error && (
            <div className="m-5 mb-0 p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-medium text-xs">
                Username or Staff ID <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or labtech1"
                  className="w-full h-9 bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-3 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-slate-300 font-medium text-xs">
                  Password <span className="text-rose-400">*</span>
                </label>
                <span className="text-[11px] text-sky-400 select-none">Encrypted Token</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-9 bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-9 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-400" /> Auto Workstation Handshake
              </span>
              <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700">
                TLS 1.3
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 mt-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-sky-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>{loading ? 'Verifying Credentials...' : 'Sign In to Workstation'}</span>
            </button>
          </form>

          {/* Compliance Footer */}
          <div className="px-6 py-3 bg-[#0f172a] border-t border-[#334155] text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>HIPAA & NABL Compliant • Audit Logged • Role Scoped</span>
            </div>
          </div>
        </div>

        {/* Quick Session Switcher (Direct Access Node) */}
        <div className="p-3.5 bg-[#1e293b]/70 border border-[#334155] rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Quick Demo Node Switcher
            </span>
            <span className="text-[10px] text-slate-500 font-mono">1-Click Auto Fill</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              data-testid="demo-admin"
              aria-label="Admin"
              onClick={() => fillQuickLogin('admin', 'AdminPassword123!')}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] hover:border-purple-500/50 transition text-left cursor-pointer group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-semibold text-slate-200 text-xs leading-tight">Administrator</div>
                <div className="text-[10px] text-purple-400 font-mono">Director Tier</div>
              </div>
            </button>

            <button
              type="button"
              data-testid="demo-labtech"
              aria-label="Lab Tech"
              onClick={() => fillQuickLogin('labtech1', 'TechPassword123!')}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] hover:border-sky-500/50 transition text-left cursor-pointer group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-semibold text-slate-200 text-xs leading-tight">Lab Technician</div>
                <div className="text-[10px] text-sky-400 font-mono">Biochemistry</div>
              </div>
            </button>

            <button
              type="button"
              data-testid="demo-frontdesk"
              aria-label="Front Desk"
              onClick={() => fillQuickLogin('reception1', 'DeskPassword123!')}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] hover:border-amber-500/50 transition text-left cursor-pointer group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-semibold text-slate-200 text-xs leading-tight">Front Desk</div>
                <div className="text-[10px] text-amber-400 font-mono">Intake & Triage</div>
              </div>
            </button>

            <button
              type="button"
              data-testid="demo-client"
              aria-label="Referring Clinic"
              onClick={() => fillQuickLogin('clinic_sample', 'client123')}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] hover:border-emerald-500/50 transition text-left cursor-pointer group"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-semibold text-slate-200 text-xs leading-tight">Referring Clinic</div>
                <div className="text-[10px] text-emerald-400 font-mono">Client Portal</div>
              </div>
            </button>

            <button
              type="button"
              data-testid="demo-doctor"
              aria-label="Doctor"
              onClick={() => fillQuickLogin('doctor1', 'DoctorPassword123!')}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-[#0f172a] hover:bg-[#131b2e] border border-[#334155] hover:border-teal-500/50 transition text-left cursor-pointer group col-span-2"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 shrink-0 group-hover:scale-110 transition-transform" />
              <div className="truncate">
                <div className="font-semibold text-slate-200 text-xs leading-tight">Doctor / Pathologist</div>
                <div className="text-[10px] text-teal-400 font-mono">Clinical Sign-Off & Approval (doctor1)</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
