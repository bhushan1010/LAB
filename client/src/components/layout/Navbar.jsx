import React from 'react';
import { useAuth } from '../../context/AuthContext';
import SyncBadge from '../sync/SyncBadge';
import {
  Printer,
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
} from 'lucide-react';

export default function Navbar({
  currentView = 'studio',
  onNavigate,
  onPrint,
  onSave,
  saving,
  statusMessage,
}) {
  const { user, logout, deviceId, setDeviceId } = useAuth();

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

  return (
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition duration-150 ${
                currentView === 'workflow'
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/40 font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e293b] border border-transparent'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Workflow
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

        {/* Studio-specific action buttons */}
        {currentView === 'studio' && (
          <>
            <button
              type="button"
              onClick={onPrint}
              className="px-3 py-1.5 bg-[#1e293b] hover:bg-[#334155] text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#334155] transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" /> Print (Ctrl+P)
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={onSave}
              className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition"
            >
              {saving ? 'Saving...' : 'Save & Finalize'}
            </button>
          </>
        )}

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-2 bg-[#1e293b] border border-[#334155] px-3 py-1 rounded-lg text-xs shadow-xs">
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
          </div>
        )}

        {/* Logout */}
        {user && (
          <button
            type="button"
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-[#1e293b] border border-transparent hover:border-[#334155] rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
}
