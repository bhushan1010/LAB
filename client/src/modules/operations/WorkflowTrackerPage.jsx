import React, { useState, useEffect, useMemo } from 'react';
import api from '@core/api';
import { useAuth } from '@modules/auth';
import {
  Layers,
  Search,
  RefreshCw,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck2,
  ChevronRight,
  Printer,
  AlertCircle,
} from 'lucide-react';
import { StatusChip } from '@shared/ui';
import PipelineStats from './PipelineStats';
import MobileCardView from './MobileCardView';

export default function WorkflowTrackerPage({ onNavigate, onEditReport }) {
  const { user } = useAuth();
  const role = user?.role || 'front-desk';
  const [stageFilter, setStageFilter] = useState('ALL');

  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);

  // Approval / Review / Cancellation Modal state
  const [approvalModal, setApprovalModal] = useState({
    open: false,
    item: null, // { visit, report }
    action: 'approved', // 'approved' | 'rejected' | 'cancelled'
    note: '',
    clientFacingReason: 'Specimen unsuitable for testing',
  });

  // Load workflow items (visits query already left-joins report details)
  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      const visitsRes = await api.get('/visits?limit=100');
      if (visitsRes.data.success) {
        setVisits(visitsRes.data.visits || []);
        window.dispatchEvent(new CustomEvent('workflow:doctor-updated'));
      }
    } catch (err) {
      console.error('Failed to load workflow data:', err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadWorkflowData();
  }, []);

  // Map each visit to its corresponding report (already joined) and determine stage
  const workflowItems = useMemo(() => {
    return visits.map((v) => {
      const report = v.report_id ? {
        id: v.report_id,
        report_code: v.report_code,
        barcode_value: v.barcode_value,
        status: v.report_status,
        qr_token: v.qr_token,
        doctor_approval_status: v.doctor_approval_status,
        approved_by_doctor_name: v.approved_by_doctor_name,
        approved_at: v.approved_at,
        approval_note: v.approval_note,
        printed_at: v.printed_at,
        cancellation_reason: v.cancellation_reason,
        client_facing_reason: v.client_facing_reason,
      } : null;

      const isCancelled = v.status === 'cancelled' || report?.status === 'cancelled';
      const cancellationReason = v.client_facing_reason || v.cancellation_reason || (report?.status === 'cancelled' ? 'Sample cancelled' : null);

      // Determine 4-Stage Pipeline Classification:
      // Stage 1: Registered (No report yet, status is registered)
      // Stage 2: Testing (In testing or report doctor_approval_status is 'rejected')
      // Stage 3: Doctor Approval (Report generated, pending approval, not yet printed)
      // Stage 4: Done (Doctor approved OR physically printed/dispatched)
      let stage = 'registered';
      let doneType = null; // 'doctor_approved' | 'dispatched_direct'

      if (report) {
        if (report.doctor_approval_status === 'approved') {
          stage = 'done';
          doneType = 'doctor_approved';
        } else if (report.printed_at) {
          stage = 'done';
          doneType = 'dispatched_direct';
        } else if (report.doctor_approval_status === 'rejected') {
          stage = 'testing';
        } else {
          // Report exists, not printed, not approved -> in Doctor Approval stage
          stage = 'approval';
        }
      } else {
        if (v.status === 'in-testing' || v.status === 'in_testing') {
          stage = 'testing';
        } else {
          stage = 'registered';
        }
      }

      return {
        visit: v,
        report,
        stage,
        doneType,
        isCancelled,
        cancellationReason,
      };
    });
  }, [visits]);

  // Filtered items by search query
  const filteredItems = useMemo(() => {
    if (!search.trim()) return workflowItems;
    const q = search.toLowerCase();
    return workflowItems.filter(({ visit, report }) => {
      return (
        visit.patient_name?.toLowerCase().includes(q) ||
        visit.patient_uhid?.toLowerCase().includes(q) ||
        visit.visit_code?.toLowerCase().includes(q) ||
        visit.ref_doctor?.toLowerCase().includes(q) ||
        visit.client_name?.toLowerCase().includes(q) ||
        report?.report_code?.toLowerCase().includes(q)
      );
    });
  }, [workflowItems, search]);

  const cancelledCount = useMemo(() => {
    return filteredItems.filter((i) => i.isCancelled).length;
  }, [filteredItems]);

  // Group items by stage (excluding cancelled by default, unless showCancelled toggle is on)
  const columns = useMemo(() => {
    const getItems = (stageName) => {
      return filteredItems.filter((i) => {
        if (i.stage !== stageName) return false;
        if (i.isCancelled) return showCancelled;
        return true;
      });
    };

    return {
      registered: getItems('registered'),
      testing: getItems('testing'),
      approval: getItems('approval'),
      done: getItems('done'),
    };
  }, [filteredItems, showCancelled]);

  // Stage-filtered items for mobile card view and focused inspection
  const stageFilteredItems = useMemo(() => {
    return filteredItems.filter((i) => {
      if (i.isCancelled && !showCancelled) return false;
      if (stageFilter === 'ALL') return true;
      if (stageFilter === 'PRIORITY_IMP') {
        return (
          i.visit?.sample_type?.toUpperCase().includes('STAT') ||
          i.visit?.sample_type?.toUpperCase().includes('URGENT') ||
          i.visit?.urgency === 'STAT' ||
          i.visit?.urgency === 'URGENT'
        );
      }
      return i.stage === stageFilter;
    });
  }, [filteredItems, stageFilter, showCancelled]);

  // Handle Doctor Approval / Rejection / Cancellation Action
  const handleDoctorAction = async (e) => {
    e.preventDefault();
    if (!approvalModal.item?.report?.id) return;

    setSubmitting(true);
    try {
      if (approvalModal.action === 'cancelled') {
        const res = await api.post(`/reports/${approvalModal.item.report.id}/cancel`, {
          reason: approvalModal.note,
          client_facing_reason: approvalModal.clientFacingReason,
        });

        if (res.data.success) {
          setActionMessage({
            type: 'warning',
            text: `Report #${approvalModal.item.report.report_code} sample cancelled and voided from pipeline.`,
          });
          setApprovalModal({ open: false, item: null, action: 'approved', note: '', clientFacingReason: 'Specimen unsuitable for testing' });
          loadWorkflowData();
          setTimeout(() => setActionMessage(null), 4000);
        }
      } else {
        const res = await api.post(`/reports/${approvalModal.item.report.id}/approve`, {
          status: approvalModal.action,
          note: approvalModal.note,
        });

        if (res.data.success) {
          setActionMessage({
            type: approvalModal.action === 'approved' ? 'success' : 'warning',
            text: approvalModal.action === 'approved'
              ? `Report #${approvalModal.item.report.report_code} clinically approved!`
              : `Report #${approvalModal.item.report.report_code} rejected back to testing for revisions.`,
          });
          setApprovalModal({ open: false, item: null, action: 'approved', note: '', clientFacingReason: 'Specimen unsuitable for testing' });
          loadWorkflowData();
          setTimeout(() => setActionMessage(null), 4000);
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit clinical review action');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCancelledCard = (visit, cancellationReason) => (
    <div
      key={visit.id}
      className="p-3 bg-[#0b1326]/90 border border-dashed border-rose-900/60 rounded-xl space-y-2 opacity-80 shadow-xs transition"
    >
      <div className="flex items-start justify-between gap-1">
        <div>
          <div className="font-medium text-slate-400 text-xs line-through leading-snug">
            {visit.patient_name}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
            {visit.patient_uhid} • {visit.visit_code}
          </div>
        </div>
        <StatusChip status="CANCELLED" size="sm" />
      </div>
      <div className="p-1.5 bg-rose-950/30 border border-rose-900/40 rounded text-[10px] text-rose-300 font-mono">
        Reason: {cancellationReason || 'Sample cancelled'}
      </div>
      <div className="text-[9px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-[#334155]/40">
        <span>Voided from pipeline</span>
        <span>{visit.client_name ? `Clinic: ${visit.client_name}` : 'Internal'}</span>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-950/50 border border-sky-400/30">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-100 tracking-tight font-sans">
              Laboratory Clinical Pipeline
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-sky-400 font-bold uppercase">
              Live Stage Tracker
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Unified 4-stage progression board across Intake, Laboratory Testing, Pathologist Review, and Final Dispatch
          </p>
        </div>

        {/* Controls & Search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search UHID, patient, doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 h-8.5 bg-[#0f172a] border border-[#334155] rounded-lg pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans"
            />
          </div>

          <label className="flex items-center gap-1.5 h-8.5 px-2.5 bg-[#0f172a] border border-[#334155] hover:border-slate-500 rounded-lg text-xs text-slate-300 cursor-pointer select-none transition">
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#334155] text-rose-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 cursor-pointer"
            />
            <span className="font-mono text-[11px] flex items-center gap-1">
              Show Cancelled
              {cancelledCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                  {cancelledCount}
                </span>
              )}
            </span>
          </label>

          <button
            type="button"
            onClick={loadWorkflowData}
            disabled={loading}
            className="h-8.5 px-3 bg-[#1e293b] hover:bg-[#334155] text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-[#334155] transition shadow-xs cursor-pointer"
            title="Refresh Board"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-sky-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Global Action Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
              : 'bg-amber-950/80 border-amber-800 text-amber-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Visual Pipeline Stage Breakdown (Ported from labtrack-lims) */}
      <PipelineStats
        items={workflowItems}
        currentStatusFilter={stageFilter}
        onSelectFilter={setStageFilter}
      />

      {/* Mobile-Responsive Card View (Ported from labtrack-lims) */}
      <div className="block md:hidden">
        <MobileCardView
          items={stageFilteredItems}
          role={role}
          onEditReport={onEditReport}
          onOpenApproval={(item, action) => {
            setApprovalModal({
              open: true,
              item: { visit: item.visit, report: item.report },
              action,
              note: '',
              clientFacingReason: 'Specimen unsuitable for testing',
            });
          }}
          onNavigate={onNavigate}
        />
      </div>

      {/* 4 Pipeline Stages (Columns) - Desktop View */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {/* STAGE 1: REGISTERED */}
        <div className="bg-[#131b2e] border border-[#334155] rounded-xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3.5 border-b border-[#334155] bg-[#0b1326] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                1. Registered
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/80 text-blue-400">
              {columns.registered.length}
            </span>
          </div>

          <div className="p-3 space-y-3 min-h-[420px] max-h-[700px] overflow-y-auto">
            {columns.registered.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No samples waiting in intake
              </div>
            ) : (
              columns.registered.map(({ visit, isCancelled, cancellationReason }) => {
                if (isCancelled) return renderCancelledCard(visit, cancellationReason);
                return (
                  <div
                    key={visit.id}
                    className="p-3 bg-[#1e293b] border border-[#334155] hover:border-blue-500/50 rounded-xl transition shadow-xs space-y-2.5 group"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="font-semibold text-slate-100 text-xs leading-snug">
                          {visit.patient_name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {visit.patient_uhid} • {visit.visit_code}
                        </div>
                      </div>
                      <StatusChip status="REGISTERED" size="sm" label="INTAKE" />
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Sample Type:</span>
                        <span className="text-slate-200 font-mono font-medium truncate max-w-[140px]">
                          {visit.sample_type || 'SERUM'}
                        </span>
                      </div>
                      {visit.ref_doctor && (
                        <div className="text-[10px] text-slate-400 truncate">
                          Ref: <span className="text-slate-300">{visit.ref_doctor}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#334155]/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {visit.collected_at
                          ? (!isNaN(new Date(visit.collected_at).getTime())
                              ? new Date(visit.collected_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : visit.collected_at)
                          : 'Intake'}
                      </span>
                      {(role === 'lab-tech' || role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigate) onNavigate('studio');
                          }}
                          className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 cursor-pointer"
                        >
                          Enter Tests <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* STAGE 2: TESTING */}
        <div className="bg-[#131b2e] border border-[#334155] rounded-xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3.5 border-b border-[#334155] bg-[#0b1326] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                2. Testing
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-400">
              {columns.testing.length}
            </span>
          </div>

          <div className="p-3 space-y-3 min-h-[420px] max-h-[700px] overflow-y-auto">
            {columns.testing.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No samples under test analysis
              </div>
            ) : (
              columns.testing.map(({ visit, report, isCancelled, cancellationReason }) => {
                if (isCancelled) return renderCancelledCard(visit, cancellationReason);
                const isRejected = report?.doctor_approval_status === 'rejected';
                return (
                  <div
                    key={visit.id}
                    className={`p-3 bg-[#1e293b] border rounded-xl transition shadow-xs space-y-2.5 ${
                      isRejected
                        ? 'border-rose-700/80 bg-rose-950/20'
                        : 'border-[#334155] hover:border-amber-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="font-semibold text-slate-100 text-xs leading-snug">
                          {visit.patient_name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {visit.patient_uhid} • {visit.visit_code}
                        </div>
                      </div>
                      <StatusChip status={isRejected ? 'REJECTED' : 'TESTING'} size="sm" />
                    </div>

                    {isRejected && report?.approval_note && (
                      <div className="p-2 bg-rose-950/50 border border-rose-800/60 rounded-lg text-[10px] text-rose-200">
                        <div className="font-bold text-rose-400 flex items-center gap-1 mb-0.5">
                          <AlertTriangle className="w-3 h-3" /> Doctor Note:
                        </div>
                        "{report.approval_note}"
                      </div>
                    )}

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Sample:</span>
                        <span className="text-slate-200 font-mono font-medium truncate max-w-[140px]">
                          {visit.sample_type || 'WHOLE BLOOD'}
                        </span>
                      </div>
                      {visit.ref_doctor && (
                        <div className="text-[10px] text-slate-400 truncate">
                          Ref: <span className="text-slate-300">{visit.ref_doctor}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#334155]/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {isRejected ? 'Needs Revision' : 'Bench Work'}
                      </span>
                      {(role === 'lab-tech' || role === 'admin') && (
                        <button
                          type="button"
                          onClick={() => {
                            if (report && onEditReport) {
                              onEditReport(report);
                            } else if (onNavigate) {
                              onNavigate('studio');
                            }
                          }}
                          className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <FlaskConical className="w-3 h-3" /> {isRejected ? 'Revise Report' : 'Open Studio'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* STAGE 3: DOCTOR APPROVAL */}
        <div className="bg-[#131b2e] border border-[#334155] rounded-xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3.5 border-b border-[#334155] bg-[#0b1326] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                3. Doctor Approval
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-950/80 border border-teal-800/80 text-teal-400">
              {columns.approval.length}
            </span>
          </div>

          <div className="p-3 space-y-3 min-h-[420px] max-h-[700px] overflow-y-auto">
            {columns.approval.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No reports waiting for sign-off
              </div>
            ) : (
              columns.approval.map(({ visit, report, isCancelled, cancellationReason }) => {
                if (isCancelled) return renderCancelledCard(visit, cancellationReason);
                return (
                  <div
                    key={visit.id}
                    className="p-3 bg-[#1e293b] border border-teal-800/60 hover:border-teal-500 rounded-xl transition shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="font-semibold text-slate-100 text-xs leading-snug">
                          {visit.patient_name}
                        </div>
                        <div className="text-[10px] font-mono text-teal-400 mt-0.5">
                          {report?.report_code || visit.visit_code}
                        </div>
                      </div>
                      <StatusChip status="DOCTOR_APPROVAL" size="sm" label="AWAITING SIGN-OFF" />
                    </div>

                    <div className="text-[11px] text-slate-300 space-y-1">
                      <div className="text-[10px] text-slate-400 truncate">
                        Doctor: <span className="text-slate-200 font-medium">{visit.ref_doctor || 'Hospital Staff'}</span>
                      </div>
                      {report?.interpretation && (
                        <div className="text-[10px] text-slate-400 italic line-clamp-2 bg-[#0f172a] p-1.5 rounded border border-[#334155]/60">
                          "{report.interpretation}"
                        </div>
                      )}
                    </div>

                    {/* Actions depending on Role */}
                    <div className="pt-2 border-t border-[#334155]/60 space-y-2">
                      {(role === 'doctor' || role === 'admin') ? (
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalModal({
                                open: true,
                                item: { visit, report },
                                action: 'approved',
                                note: '',
                                clientFacingReason: 'Specimen unsuitable for testing',
                              });
                            }}
                            className="px-1.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-[10px] rounded-lg transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                            title="Clinically approve report"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalModal({
                                open: true,
                                item: { visit, report },
                                action: 'rejected',
                                note: '',
                                clientFacingReason: 'Specimen unsuitable for testing',
                              });
                            }}
                            className="px-1.5 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-800 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Reject back to testing for revisions"
                          >
                            <AlertTriangle className="w-3 h-3" /> Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setApprovalModal({
                                open: true,
                                item: { visit, report },
                                action: 'cancelled',
                                note: '',
                                clientFacingReason: 'Specimen unsuitable for testing',
                              });
                            }}
                            className="px-1.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[10px] font-bold rounded-lg transition flex items-center justify-center gap-1 cursor-pointer"
                            title="Cancel sample & void report"
                          >
                            <XCircle className="w-3 h-3" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-400 font-mono">Pending Pathologist</span>
                          {report && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onNavigate) onNavigate('print-queue');
                              }}
                              className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-1 font-semibold cursor-pointer"
                            >
                              Queue <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* STAGE 4: DONE */}
        <div className="bg-[#131b2e] border border-[#334155] rounded-xl flex flex-col overflow-hidden shadow-lg">
          <div className="p-3.5 border-b border-[#334155] bg-[#0b1326] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                4. Done
              </h3>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              {columns.done.length}
            </span>
          </div>

          <div className="p-3 space-y-3 min-h-[420px] max-h-[700px] overflow-y-auto">
            {columns.done.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No finalized items today
              </div>
            ) : (
              columns.done.map(({ visit, report, doneType, isCancelled, cancellationReason }) => {
                if (isCancelled) return renderCancelledCard(visit, cancellationReason);
                return (
                  <div
                    key={visit.id}
                    className="p-3 bg-[#1e293b] border border-emerald-900/60 hover:border-emerald-700 rounded-xl transition shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="font-semibold text-slate-100 text-xs leading-snug">
                          {visit.patient_name}
                        </div>
                        <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
                          {report?.report_code || visit.visit_code}
                        </div>
                      </div>
                      <StatusChip
                        status={doneType === 'doctor_approved' ? 'APPROVED' : 'PRINTED'}
                        size="sm"
                        label={doneType === 'doctor_approved' ? 'APPROVED' : 'DISPATCHED'}
                      />
                    </div>

                    <div className="text-[10px] text-slate-400 space-y-1">
                      {doneType === 'doctor_approved' ? (
                        <div className="text-teal-300 font-medium">
                          Signed off by {report?.approved_by_doctor_name || 'Dr. Suresh Pathologist'}
                        </div>
                      ) : (
                        <div className="text-slate-400 font-medium">
                          Printed & dispatched directly
                        </div>
                      )}
                      {report?.approval_note && (
                        <div className="text-[10px] text-slate-300 italic">
                          Note: "{report.approval_note}"
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#334155]/60 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {report?.approved_at
                          ? (!isNaN(new Date(report.approved_at).getTime()) ? new Date(report.approved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : report.approved_at)
                          : (report?.printed_at ? (!isNaN(new Date(report.printed_at).getTime()) ? new Date(report.printed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : report.printed_at) : 'Ready')}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigate) onNavigate('print-queue');
                        }}
                        className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Printer className="w-3 h-3" /> View In Queue
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Doctor Approval / Rejection / Cancellation Modal */}
      {approvalModal.open && approvalModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-[#1e293b] border border-[#334155] rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  approvalModal.action === 'approved'
                    ? 'bg-teal-950 border border-teal-700 text-teal-400'
                    : approvalModal.action === 'rejected'
                    ? 'bg-amber-950 border border-amber-700 text-amber-400'
                    : 'bg-rose-950 border border-rose-700 text-rose-400'
                }`}
              >
                {approvalModal.action === 'approved' ? (
                  <FileCheck2 className="w-5 h-5" />
                ) : approvalModal.action === 'rejected' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-sans">
                  {approvalModal.action === 'approved'
                    ? 'Confirm Clinical Approval'
                    : approvalModal.action === 'rejected'
                    ? 'Reject Report Back to Testing'
                    : 'Cancel Sample & Void Report'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Report #{approvalModal.item.report?.report_code} • {approvalModal.item.visit?.patient_name}
                </p>
              </div>
            </div>

            <form onSubmit={handleDoctorAction} className="space-y-3.5 text-xs">
              <div className="p-3 bg-[#0f172a] rounded-xl border border-[#334155] space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>Patient UHID:</span>
                  <span className="text-slate-200">{approvalModal.item.visit?.patient_uhid}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Encounter Code:</span>
                  <span className="text-slate-200">{approvalModal.item.visit?.visit_code}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sample Type:</span>
                  <span className="text-slate-200">{approvalModal.item.visit?.sample_type || 'SERUM'}</span>
                </div>
                {approvalModal.item.visit?.client_name && (
                  <div className="flex justify-between text-slate-400">
                    <span>Referring Clinic:</span>
                    <span className="text-emerald-400 font-sans">{approvalModal.item.visit.client_name}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {approvalModal.action === 'approved'
                    ? 'Clinical Approval Note (Optional)'
                    : approvalModal.action === 'rejected'
                    ? 'Rejection Reason / Guidance for Lab Tech *'
                    : 'Internal Cancellation Reason (Audit Log) *'}
                </label>
                <textarea
                  rows={3}
                  required={approvalModal.action !== 'approved'}
                  placeholder={
                    approvalModal.action === 'approved'
                      ? 'e.g. Findings verified and correlated clinically.'
                      : approvalModal.action === 'rejected'
                      ? 'e.g. Hemolysis noted on specimen; please re-run hemoglobin.'
                      : 'e.g. Gross hemolysis; specimen compromised and patient refusing redraw.'
                  }
                  value={approvalModal.note}
                  onChange={(e) => setApprovalModal((prev) => ({ ...prev, note: e.target.value }))}
                  className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs font-sans"
                />
              </div>

              {approvalModal.action === 'cancelled' && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Client-Facing Reason (Referring Clinic Portal) *
                  </label>
                  <select
                    value={approvalModal.clientFacingReason}
                    onChange={(e) => setApprovalModal((prev) => ({ ...prev, clientFacingReason: e.target.value }))}
                    className="w-full bg-[#0f172a] border border-[#334155] rounded-lg p-2 text-slate-100 focus:outline-none focus:border-rose-500 text-xs font-sans cursor-pointer"
                  >
                    <option value="Specimen unsuitable for testing">Specimen unsuitable for testing</option>
                    <option value="Insufficient sample volume">Insufficient sample volume</option>
                    <option value="Collection cancelled">Collection cancelled</option>
                    <option value="Other — see lab">Other — see lab</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Constrained client-safe reason visible to referring clinics in their portal.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#334155]">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setApprovalModal({ open: false, item: null, action: 'approved', note: '', clientFacingReason: 'Specimen unsuitable for testing' })}
                  className="px-3.5 py-1.5 bg-[#0f172a] hover:bg-[#334155] text-slate-300 rounded-lg font-medium transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer ${
                    approvalModal.action === 'approved'
                      ? 'bg-teal-500 hover:bg-teal-400 text-slate-950'
                      : approvalModal.action === 'rejected'
                      ? 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {submitting ? (
                    'Processing...'
                  ) : approvalModal.action === 'approved' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sign-off & Approve
                    </>
                  ) : approvalModal.action === 'rejected' ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" /> Submit Rejection
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> Cancel & Void Sample
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
