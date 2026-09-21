import React, { useState, useEffect, useCallback } from 'react';
import api from '@core/api';
import { useAuth } from '@modules/auth';
import { SyncBadge } from '@shared/ui';
import {
  Monitor,
  LogOut,
  CheckCircle2,
  Shield,
  LayoutDashboard,
  FlaskConical,
  Users,
  ShieldAlert,
  Clock,
  Building2,
  Layers,
  Key,
  Lock,
  ChevronDown,
  X,
  AlertCircle,
} from 'lucide-react';

export default function Navbar({
  currentView = 'studio',
  onNavigate,
  statusMessage,
  renderActions,
}) {
  const { user, logout, deviceId, setDeviceId } = useAuth();
  const [pendingDoctorCount, setPendingDoctorCount] = useState(0);

  // Self-service password change & account menu state
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [selfPwForm, setSelfPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [selfPwSubmitting, setSelfPwSubmitting] = useState(false);
  const [selfPwError, setSelfPwError] = useState('');
  const [selfPwSuccess, setSelfPwSuccess] = useState('');


  const deviceOptions = [
    'LAN-PC-01 (Reception)',
    'LAN-PC-02 (Biochemistry)',
    'LAN-PC-03 (Hematology)',
    'LAN-PC-04 (Doctor Review)',
    'LAN-PC-05 (Sample Collection)',
    'REMOTE-01 (Dr. Clinic Laptop)',
    'REMOTE-02 (Field Tab)',
  ];

  const role = user?.role || 'front-desk';

  const fetchDoctorPendingCount = useCallback(async () => {
    if (role !== 'doctor') {
      setPendingDoctorCount(0);
      return;
    }
    try {
      const res = await api.get('/reports/pending-doctor-approval');
      if (res.data?.success) {
        setPendingDoctorCount(res.data.count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch doctor pending count:', err);
    }
  }, [role]);

  useEffect(() => {
    fetchDoctorPendingCount();

    if (role === 'doctor') {
      const interval = setInterval(fetchDoctorPendingCount, 30000);
      const handleUpdate = () => fetchDoctorPendingCount();
      window.addEventListener('workflow:doctor-updated', handleUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('workflow:doctor-updated', handleUpdate);
      };
    }
  }, [role, fetchDoctorPendingCount]);

  useEffect(() => {
    if (role === 'doctor') {
      fetchDoctorPendingCount();
    }
  }, [currentView, role, fetchDoctorPendingCount]);

  const handleOpenChangePassword = () => {
    setProfileMenuOpen(false);
    setSelfPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setSelfPwError('');
    setSelfPwSuccess('');
    setChangePasswordModalOpen(true);
  };

  const handleSelfChangePassword = async (e) => {
    e.preventDefault();
    setSelfPwError('');
    setSelfPwSuccess('');

    if (!selfPwForm.currentPassword) {
      setSelfPwError('Current password is required');
      return;
    }
    if (!selfPwForm.newPassword) {
      setSelfPwError('New password is required');
      return;
    }
    if (!selfPwForm.confirmPassword) {
      setSelfPwError('Please confirm your new password');
      return;
    }
    if (selfPwForm.newPassword !== selfPwForm.confirmPassword) {
      setSelfPwError('New password and confirmation do not match');
      return;
    }
    if (selfPwForm.newPassword.length < 6) {
      setSelfPwError('New password must be at least 6 characters long');
      return;
    }

    setSelfPwSubmitting(true);
    try {
      const res = await api.put('/auth/me/password', {
        current_password: selfPwForm.currentPassword,
        new_password: selfPwForm.newPassword,
        confirm_password: selfPwForm.confirmPassword,
      });

      if (res.data?.success) {
        setSelfPwSuccess(res.data.message || 'Password changed successfully!');
        setSelfPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setChangePasswordModalOpen(false);
          setSelfPwSuccess('');
        }, 1800);
      }
    } catch (err) {
      setSelfPwError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setSelfPwSubmitting(false);
    }
  };



  return (
    <>
      <header className="bg-[#0b1326] border-b border-[#334155] sticky top-0 z-30 px-5 py-2.5 flex items-center justify-between no-print shadow-md">

      {/* Brand & Navigation Tabs */}
      <div className="flex items-center gap-5">
        <div
          onClick={() => {
            if (role !== 'client' && onNavigate) onNavigate('dashboard');
          }}
          className={`flex items-center gap-2.5 group ${role !== 'client' ? 'cursor-pointer' : ''}`}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-950/50 border border-sky-400/40">
            <FlaskConical className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xs font-extrabold text-slate-100 tracking-wider font-sans">
                LABTRACK
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/15 border border-sky-500/30 text-sky-400 font-bold uppercase tracking-tight">
                LIMS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {role === 'client' ? 'Referring Clinic Portal' : 'Clinical Slate Precision'}
            </p>
          </div>
        </div>

        {/* Scoped Navigation Links */}
        {role !== 'client' ? (
          <nav className="flex items-center gap-1.5 ml-2">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition duration-150 ${
                currentView === 'dashboard'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] border border-transparent'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </button>

            {role !== 'front-desk' && (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('studio')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition duration-150 ${
                  currentView === 'studio'
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40 font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] border border-transparent'
                }`}
              >
                <FlaskConical className="w-3.5 h-3.5" /> Report Studio
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('workflow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition duration-150 relative ${
                currentView === 'workflow'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Workflow</span>
              {role === 'doctor' && pendingDoctorCount > 0 && (
                <span
                  data-testid="doctor-pending-badge"
                  className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse leading-none shadow-xs"
                  title={`${pendingDoctorCount} reports awaiting Doctor Approval`}
                >
                  {pendingDoctorCount}
                </span>
              )}
            </button>


            <button
              type="button"
              onClick={() => onNavigate && onNavigate('print-queue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition duration-150 ${
                currentView === 'print-queue'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] border border-transparent'
              }`}
            >
              <Clock className="w-3.5 h-3.5" /> Print Queue
            </button>

            {role === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('users')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition duration-150 ${
                    currentView === 'users'
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] border border-transparent'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Staff
                </button>

                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('audit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition duration-150 ${
                    currentView === 'audit'
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40 font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] border border-transparent'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Audit Trail
                </button>
              </>
            )}
          </nav>
        ) : (
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-800/80 px-3 py-1.5 rounded-lg shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            Clinic Sample Progression Board
          </div>
        )}
      </div>

      {/* Center Status Feedback */}
      {statusMessage && (
        <div className="text-xs bg-emerald-950/90 border border-emerald-700/80 text-emerald-300 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse font-medium shadow-md">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Sync Status Badge */}
        {role !== 'client' && <SyncBadge />}

        {/* Device Switcher (Editable by Admin, Read-Only for Staff) */}
        {role !== 'client' && (
          <div className="flex items-center gap-1.5 bg-[#1e293b] border border-[#334155] px-2.5 py-1 rounded-lg text-xs text-slate-300 shadow-xs">
            <Monitor className="w-3.5 h-3.5 text-sky-400" />
            {role === 'admin' ? (
              <select
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="bg-transparent border-none text-slate-200 text-xs font-mono focus:outline-none cursor-pointer"
                title="Admin Workstation Switcher"
              >
                {deviceOptions.map((dev) => (
                  <option key={dev} value={dev.split(' ')[0]} className="bg-[#0f172a] text-slate-100">
                    {dev}
                  </option>
                ))}
              </select>
            ) : (
              <span
                className="text-slate-300 font-mono text-xs select-none"
                title="Assigned Workstation (Read-only for staff)"
              >
                {deviceOptions.find((d) => d.startsWith(deviceId)) || deviceId}
              </span>
            )}
          </div>
        )}

        {/* Custom Actions Slot */}
        {renderActions && (typeof renderActions === 'function' ? renderActions() : renderActions)}

        {/* User Account / Profile Menu */}
        {user && (
          <div className="relative">
            <button
              type="button"
              data-testid="account-menu-btn"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 bg-[#1e293b] hover:bg-[#283548] border border-[#334155] px-3 py-1 rounded-lg text-xs shadow-xs transition cursor-pointer"
              title="Account Menu"
            >
              {role === 'client' ? (
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-purple-400" />
              )}
              <span className="font-semibold text-slate-200">{user.full_name}</span>
              <span
                className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-mono font-bold border ${
                  role === 'client'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : role === 'admin'
                    ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                    : role === 'doctor'
                    ? 'bg-teal-950/80 text-teal-300 border-teal-800'
                    : role === 'lab-tech'
                    ? 'bg-sky-950/80 text-sky-300 border-sky-800'
                    : 'bg-amber-950/80 text-amber-300 border-amber-800'
                }`}
              >
                {user.role}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {profileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileMenuOpen(false)}
                />
                <div
                  data-testid="profile-dropdown-menu"
                  className="absolute right-0 mt-1.5 w-60 bg-[#1e293b] border border-[#334155] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="px-3.5 py-2 border-b border-[#334155]/70">
                    <div className="text-xs font-bold text-slate-100 truncate">{user.full_name}</div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">@{user.username}</div>
                    {user.assigned_workstation && (
                      <div className="text-[10px] text-sky-400 font-mono mt-1">
                        Station: {user.assigned_workstation}
                      </div>
                    )}
                  </div>

                  <div className="p-1 space-y-0.5">
                    <button
                      type="button"
                      data-testid="open-change-password-btn"
                      onClick={handleOpenChangePassword}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-200 hover:text-white hover:bg-[#334155]/60 rounded-lg transition font-medium cursor-pointer"
                    >
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Change Password</span>
                    </button>

                    <button
                      type="button"
                      data-testid="dropdown-signout-btn"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 rounded-lg transition font-medium cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Quick Logout Button */}
        {user && (
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#1e293b] border border-transparent hover:border-[#334155] rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>

    {/* Self-Service Change Password Modal */}
    {changePasswordModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 relative">
          <div className="flex items-start justify-between border-b border-[#334155] pb-3.5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-950/80 border border-amber-700/80 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-sans leading-snug">
                  Change Password
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Re-enter current password to verify identity on shared workstations.
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="self-password-close-btn"
              onClick={() => setChangePasswordModalOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0f172a] transition cursor-pointer"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {selfPwError && (
            <div
              data-testid="self-password-error"
              className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2.5 shadow-xs animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium">{selfPwError}</span>
            </div>
          )}

          {selfPwSuccess ? (
            <div
              data-testid="self-password-success"
              className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl space-y-2 animate-in fade-in duration-150"
            >
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Password Changed Successfully
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Your password has been updated. Please remember to use your new password next time you log in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSelfChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1.5 font-medium">
                  Current Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    data-testid="self-current-password"
                    required
                    placeholder="Enter your current password"
                    value={selfPwForm.currentPassword}
                    onChange={(e) => setSelfPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono text-xs transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-medium">
                  New Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    data-testid="self-new-password"
                    required
                    placeholder="Minimum 6 characters"
                    value={selfPwForm.newPassword}
                    onChange={(e) => setSelfPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono text-xs transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1.5 font-medium">
                  Confirm New Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="password"
                    data-testid="self-confirm-password"
                    required
                    placeholder="Re-enter your new password"
                    value={selfPwForm.confirmPassword}
                    onChange={(e) => setSelfPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-3 py-2.5 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono text-xs transition"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#0f172a] border border-[#334155] rounded-xl text-[11px] text-slate-400 space-y-1">
                <div className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-amber-400" /> Workstation Identity Protection
                </div>
                <div>• Current password must be confirmed to authorize this credential update.</div>
                <div>• Password will be salted with bcrypt; plaintext is never stored.</div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setChangePasswordModalOpen(false)}
                  className="px-4 py-2 bg-[#0f172a] text-slate-300 rounded-lg font-medium hover:bg-[#334155] cursor-pointer transition border border-[#334155]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="self-password-submit"
                  disabled={selfPwSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg font-bold shadow flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{selfPwSubmitting ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}
  </>
);
}

