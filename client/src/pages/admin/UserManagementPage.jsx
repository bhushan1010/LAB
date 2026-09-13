import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { Users, UserPlus, Shield, CheckCircle, XCircle, Key, RefreshCw, Building2, Lock, Copy } from 'lucide-react';

const COMMON_CLINICS = [
  'SAMPLE CLINIC',
  'MEDILINK MULTISPECIALITY',
  'SAMPLE SPECIALITY CLINIC',
  'SHISHU CHILD HEALTHCARE',
  'ROY WOMENS WELLNESS',
];

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [resetModal, setResetModal] = useState({
    open: false,
    user: null,
    newPassword: '',
    confirmPassword: '',
    submitting: false,
    successData: null, // { username, temporaryPassword }
  });
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'front-desk',
    client_name: '',
    assigned_workstation: 'LAN-PC-01',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/users');
      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load staff accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const payload = {
        ...form,
        assigned_workstation: ['front-desk', 'lab-tech', 'doctor'].includes(form.role)
          ? (form.assigned_workstation || null)
          : null,
        client_name: form.role === 'client' ? (form.client_name || form.full_name) : null,
      };
      const res = await api.post('/auth/users', payload);
      if (res.data.success) {
        setSuccess(`Account "${form.username}" created successfully!`);
        setModalOpen(false);
        setForm({ username: '', password: '', full_name: '', role: 'front-desk', client_name: '', assigned_workstation: 'LAN-PC-01' });
        loadUsers();
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  };

  const openResetModal = (user) => {
    setError('');
    setCopied(false);
    setResetModal({
      open: true,
      user,
      newPassword: '',
      confirmPassword: '',
      submitting: false,
      successData: null,
    });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModal.user) return;
    if (resetModal.newPassword !== resetModal.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (resetModal.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setResetModal((prev) => ({ ...prev, submitting: true }));
    setError('');

    try {
      const res = await api.put(`/auth/users/${resetModal.user.id}`, {
        password: resetModal.newPassword,
      });

      if (res.data.success) {
        setResetModal((prev) => ({
          ...prev,
          submitting: false,
          successData: {
            username: resetModal.user.username,
            temporaryPassword: resetModal.newPassword,
          },
        }));
        setSuccess(`Password for ${resetModal.user.username} reset successfully!`);
        setTimeout(() => setSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
      setResetModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2 font-sans">
            <Users className="w-5 h-5 text-purple-400" />
            Staff & Client Account Management
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Admin oversight: manage individual logins, role assignments, workstation credentials, and referring clinic accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {success && (
            <span className="text-xs bg-emerald-950/90 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-lg animate-pulse font-medium">
              {success}
            </span>
          )}
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Add Account
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-300 rounded-xl text-xs">
          {error}
        </div>
      )}

      {/* Staff Table */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="bg-[#0f172a] text-slate-400 border-b border-[#334155] uppercase tracking-wider text-[10px] font-mono font-bold">
              <th className="py-3 px-4">Account / Member</th>
              <th className="py-3 px-4">Username</th>
              <th className="py-3 px-4 text-center">Assigned Role</th>
              <th className="py-3 px-4 text-center">Assigned Workstation</th>
              <th className="py-3 px-4 text-center">Account Status</th>
              <th className="py-3 px-4">Created Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#334155]/60">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-[#131b2e]/60 transition">
                <td className="py-3 px-4">
                  <div className="font-semibold text-white">{u.full_name}</div>
                  {u.role === 'client' && (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-medium">
                      <Building2 className="w-3 h-3 text-emerald-500" />
                      Clinic: {u.client_name || u.full_name}
                    </div>
                  )}
                </td>
                <td className="py-3 px-4 font-mono text-slate-300">{u.username}</td>
                <td className="py-3 px-4 text-center">
                  <select
                    value={u.role}
                    onChange={async (e) => {
                      const newRole = e.target.value;
                      try {
                        await api.put(`/auth/users/${u.id}`, { role: newRole });
                        setSuccess(`Updated role for ${u.username} to ${newRole}`);
                        loadUsers();
                        setTimeout(() => setSuccess(''), 3000);
                      } catch (err) {
                        setError(err.response?.data?.error || 'Failed to update role');
                      }
                    }}
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border cursor-pointer focus:outline-none ${
                      u.role === 'admin'
                        ? 'bg-purple-950 text-purple-300 border-purple-800'
                        : u.role === 'lab-tech'
                        ? 'bg-amber-950 text-amber-300 border-amber-800'
                        : u.role === 'doctor'
                        ? 'bg-teal-950 text-teal-300 border-teal-800'
                        : u.role === 'client'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-sky-950 text-sky-300 border-sky-800'
                    }`}
                  >
                    <option value="front-desk" className="bg-slate-900 text-sky-300">front-desk</option>
                    <option value="lab-tech" className="bg-slate-900 text-amber-300">lab-tech</option>
                    <option value="doctor" className="bg-slate-900 text-teal-300">doctor</option>
                    <option value="admin" className="bg-slate-900 text-purple-300">admin</option>
                    <option value="client" className="bg-slate-900 text-emerald-300">client (clinic)</option>
                  </select>
                </td>
                <td className="py-3 px-4 text-center">
                  {['front-desk', 'lab-tech', 'doctor'].includes(u.role) ? (
                    <select
                      value={u.assigned_workstation || ''}
                      onChange={async (e) => {
                        const newWs = e.target.value || null;
                        try {
                          await api.put(`/auth/users/${u.id}`, { assigned_workstation: newWs });
                          setSuccess(`Assigned ${u.username} to ${newWs || 'None'}`);
                          loadUsers();
                          setTimeout(() => setSuccess(''), 3000);
                        } catch (err) {
                          setError(err.response?.data?.error || 'Failed to update workstation');
                        }
                      }}
                      className="text-[10px] font-mono font-semibold px-2 py-1 rounded bg-[#0f172a] border border-[#334155] text-sky-300 cursor-pointer focus:outline-none focus:border-sky-500"
                    >
                      <option value="" className="text-slate-400">-- None --</option>
                      <option value="LAN-PC-01">LAN-PC-01 (Reception)</option>
                      <option value="LAN-PC-02">LAN-PC-02 (Biochemistry)</option>
                      <option value="LAN-PC-03">LAN-PC-03 (Hematology)</option>
                      <option value="LAN-PC-04">LAN-PC-04 (Doctor Desk)</option>
                      <option value="LAN-PC-05">LAN-PC-05 (Intake)</option>
                      <option value="REMOTE-01">REMOTE-01 (B2B Sync)</option>
                      <option value="REMOTE-02">REMOTE-02 (Mobile)</option>
                    </select>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-mono">
                      {u.role === 'admin' ? 'Fleet Control' : 'N/A (Remote)'}
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center">
                  {u.is_active ? (
                    <span className="text-[10px] text-emerald-300 bg-emerald-950/50 border border-emerald-800/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-400" /> Active
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-300 bg-rose-950/50 border border-rose-800/80 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <XCircle className="w-3 h-3 text-rose-400" /> Deactivated
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-slate-400 text-[11px]">
                  {new Date(u.created_at || Date.now()).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openResetModal(u)}
                    title="Reset Password"
                    className="px-2.5 py-1 rounded text-[10px] font-semibold transition border border-amber-800/80 text-amber-300 hover:bg-amber-950/60 inline-flex items-center gap-1"
                  >
                    <Key className="w-3 h-3 text-amber-400" />
                    Reset Password
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const newActive = !u.is_active;
                        await api.put(`/auth/users/${u.id}`, { is_active: newActive });
                        setSuccess(`${u.username} has been ${newActive ? 'activated' : 'deactivated'}`);
                        loadUsers();
                        setTimeout(() => setSuccess(''), 3000);
                      } catch (err) {
                        setError(err.response?.data?.error || 'Failed to update account status');
                      }
                    }}
                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition border ${
                      u.is_active
                        ? 'border-rose-800/80 text-rose-300 hover:bg-rose-950/60'
                        : 'border-emerald-800/80 text-emerald-300 hover:bg-emerald-950/60'
                    }`}
                  >
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-sans">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Register New Account
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  {form.role === 'client' ? 'Clinic Contact / Organization Name *' : 'Full Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={form.role === 'client' ? 'e.g. Care Womens Centre' : 'e.g. Vikram Singhania'}
                  value={form.full_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      full_name: val,
                      client_name: prev.role === 'client' && !prev.client_name ? val : prev.client_name,
                    }));
                  }}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Username *</label>
                <input
                  type="text"
                  required
                  placeholder={form.role === 'client' ? 'e.g. clinic_care' : 'e.g. tech_vikram'}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Temporary Password *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Assigned Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      role: newRole,
                      client_name: newRole === 'client' ? (prev.client_name || prev.full_name) : '',
                    }));
                  }}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="front-desk">Front Desk (Patient Registration & Printing)</option>
                  <option value="lab-tech">Lab Tech (Test Results & Report Generation)</option>
                  <option value="doctor">Doctor (Clinical Sign-off & Review)</option>
                  <option value="admin">Administrator (Full System & User Control)</option>
                  <option value="client">Client (View-Only Clinic Portal)</option>
                </select>
              </div>

              {/* Workstation Assignment for Staff Roles */}
              {['front-desk', 'lab-tech', 'doctor'].includes(form.role) && (
                <div>
                  <label className="block text-slate-300 mb-1 font-medium flex items-center justify-between">
                    <span>Assigned Workstation (Fleet Device)</span>
                    <span className="text-[10px] text-purple-400 font-mono">Server Locked</span>
                  </label>
                  <select
                    value={form.assigned_workstation || ''}
                    onChange={(e) => setForm({ ...form, assigned_workstation: e.target.value })}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500 font-mono cursor-pointer"
                  >
                    <option value="">-- None (Unassigned) --</option>
                    <option value="LAN-PC-01">LAN-PC-01 (Reception Desk)</option>
                    <option value="LAN-PC-02">LAN-PC-02 (Biochemistry Analyzer)</option>
                    <option value="LAN-PC-03">LAN-PC-03 (Hematology Analyzer)</option>
                    <option value="LAN-PC-04">LAN-PC-04 (Doctor Review Desk)</option>
                    <option value="LAN-PC-05">LAN-PC-05 (Sample Intake)</option>
                    <option value="REMOTE-01">REMOTE-01 (B2B Clinic Sync)</option>
                    <option value="REMOTE-02">REMOTE-02 (Mobile Phlebotomy)</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Scopes audit trails and report attribution on the server. Non-admins cannot alter this ID.
                  </p>
                </div>
              )}

              {/* Conditional Clinic Name Field for Client Role */}
              {form.role === 'client' && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-xl space-y-2">
                  <label className="block text-emerald-300 font-semibold flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    Linked Clinic / Client Name *
                  </label>
                  <p className="text-[10px] text-slate-400">
                    Matches the client name on visits to scope sample visibility. Choose an existing clinic or enter a new one.
                  </p>
                  <input
                    type="text"
                    required
                    list="clinicList"
                    placeholder="e.g. SAMPLE CLINIC or Care Womens Centre"
                    value={form.client_name}
                    onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                    className="w-full bg-[#0f172a] border border-emerald-700/80 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-400 text-xs"
                  />
                  <datalist id="clinicList">
                    {COMMON_CLINICS.map((clinic) => (
                      <option key={clinic} value={clinic} />
                    ))}
                  </datalist>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#334155]">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-[#0f172a] text-slate-300 rounded-lg font-medium hover:bg-[#334155] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="border-b border-[#334155] pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2 font-sans">
                <Key className="w-5 h-5 text-amber-400" />
                Reset Account Password
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Set a new temporary password for{' '}
                <span className="font-semibold text-slate-200">
                  {resetModal.user?.full_name} ({resetModal.user?.username})
                </span>
              </p>
            </div>

            {resetModal.successData ? (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-200">
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Password Reset Successfully
                  </div>
                  <p className="text-slate-300">
                    The password for <strong className="text-white">{resetModal.successData.username}</strong> has been updated. Provide this temporary password to the user:
                  </p>

                  <div className="flex items-center justify-between bg-[#0f172a] border border-emerald-800/80 rounded-lg p-2.5 mt-2">
                    <span className="font-mono text-white text-sm font-bold tracking-wider">
                      {resetModal.successData.temporaryPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(resetModal.successData.temporaryPassword);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2500);
                      }}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded font-medium flex items-center gap-1.5 transition text-[11px] cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copied ? 'Copied!' : 'Copy Password'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">
                    Note: For security, this plaintext password will not be visible again once this dialog is closed.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetModal({
                        open: false,
                        user: null,
                        newPassword: '',
                        confirmPassword: '',
                        submitting: false,
                        successData: null,
                      });
                    }}
                    className="px-4 py-2 bg-[#0f172a] hover:bg-[#334155] text-white rounded-lg font-bold shadow cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">New Password *</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={resetModal.newPassword}
                      onChange={(e) => setResetModal((prev) => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Confirm New Password *</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="Re-enter password"
                      value={resetModal.confirmPassword}
                      onChange={(e) => setResetModal((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-[#0f172a] border border-[#334155] rounded-xl text-[11px] text-slate-400 space-y-1">
                  <div className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-amber-400" /> Security Guarantee
                  </div>
                  <div>• Password will be salted and hashed with bcrypt before saving.</div>
                  <div>• Plaintext password is never stored or logged into audit trails.</div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#334155]">
                  <button
                    type="button"
                    onClick={() => setResetModal({ open: false, user: null, newPassword: '', confirmPassword: '', submitting: false, successData: null })}
                    className="px-4 py-2 bg-[#0f172a] text-slate-300 rounded-lg font-medium hover:bg-[#334155] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetModal.submitting}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg font-bold shadow flex items-center gap-1.5 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{resetModal.submitting ? 'Updating...' : 'Set New Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
