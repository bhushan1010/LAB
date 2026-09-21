import React, { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth, LoginPage } from '@modules/auth';
import DashboardPage from '@modules/operations/DashboardPage';
import Navbar from './components/layout/Navbar';
import { startBackgroundSync } from '@core/offline';

// Lazy-loaded secondary route modules (code-split)
const ReportStudioPage = lazy(() => import('@modules/clinical-studio'));
const WorkflowTrackerPage = lazy(() => import('@modules/operations/WorkflowTrackerPage'));
const PrintQueuePage = lazy(() => import('@modules/operations/PrintQueuePage'));
const ClientPortalPage = lazy(() => import('@modules/operations/ClientPortalPage'));
const PublicReportPage = lazy(() => import('@modules/operations/PublicReportPage'));
const UserManagementPage = lazy(() => import('@modules/admin/UserManagementPage'));
const AuditLogPage = lazy(() => import('@modules/admin/AuditLogPage'));
const DoctorBillingPage = lazy(() => import('@modules/admin/DoctorBillingPage'));

// Fallback spinner for in-layout route transitions
function RouteLoadingFallback({ message = 'Loading module...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400 min-h-[40vh]">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-mono tracking-wide text-slate-300">{message}</span>
      </div>
    </div>
  );
}

// Fallback spinner for full-page views (studio, public report)
function FullPageLoadingFallback({ message = 'Loading view...' }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span className="font-mono tracking-wide text-slate-300">{message}</span>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [editingReport, setEditingReport] = useState(null);
  const currentPath = window.location.pathname;

  // 1. Start background sync service when component mounts
  useEffect(() => {
    const stopSync = startBackgroundSync(30000);
    return () => stopSync();
  }, []);

  const role = user?.role || 'front-desk';

  // 2. Synchronize view with URL hash with strict RBAC guards unconditionally
  useEffect(() => {
    if (!user) return;

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '').trim();

      // Client Role Guard: completely restricted to client-portal
      if (role === 'client') {
        if (hash !== 'client-portal') {
          window.location.hash = '#/client-portal';
          setCurrentView('client-portal');
          return;
        }
        setCurrentView('client-portal');
        return;
      }

      if (!hash) {
        setCurrentView('dashboard');
        return;
      }

      // Staff guards
      if (hash === 'client-portal' && role !== 'client') {
        window.location.hash = '#/dashboard';
        setCurrentView('dashboard');
        return;
      }

      if ((hash === 'users' || hash === 'audit' || hash === 'billing') && role !== 'admin') {
        window.location.hash = '#/dashboard';
        setCurrentView('dashboard');
        return;
      }

      if (hash === 'studio' && role === 'front-desk') {
        window.location.hash = '#/dashboard';
        setCurrentView('dashboard');
        return;
      }

      if (['dashboard', 'studio', 'print-queue', 'users', 'audit', 'billing', 'client-portal', 'workflow'].includes(hash)) {
        setCurrentView(hash);
      } else {
        window.location.hash = '#/dashboard';
        setCurrentView('dashboard');
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, role]);

  // Check if public report view route (/report/:token or /reports/view/:token)
  if (currentPath.startsWith('/report/') || currentPath.startsWith('/reports/view/')) {
    return (
      <Suspense fallback={<FullPageLoadingFallback message="Retrieving Clinical Report..." />}>
        <PublicReportPage />
      </Suspense>
    );
  }

  // Loading state while checking token
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading LIMS Studio...</span>
        </div>
      </div>
    );
  }

  // If not logged in, show Login Page
  if (!user) {
    return <LoginPage />;
  }

  // If user is a referring clinic, always render the Client Portal view
  if (role === 'client') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col">
        <Navbar currentView="client-portal" onNavigate={() => {}} />
        <main className="flex-1">
          <Suspense fallback={<RouteLoadingFallback message="Loading Client Portal..." />}>
            <ClientPortalPage />
          </Suspense>
        </main>
      </div>
    );
  }

  // Handler to open an existing report from the Print Queue in the Report Studio
  const handleEditReport = (report) => {
    setEditingReport(report);
    window.location.hash = '#/studio';
    setCurrentView('studio');
  };

  // Safe navigation with RBAC guards
  const handleNavigate = (view) => {
    if (role === 'client') {
      window.location.hash = '#/client-portal';
      setCurrentView('client-portal');
      return;
    }
    if ((view === 'users' || view === 'audit' || view === 'billing') && role !== 'admin') {
      window.location.hash = '#/dashboard';
      setCurrentView('dashboard');
      return;
    }
    if (view === 'studio' && role === 'front-desk') {
      window.location.hash = '#/dashboard';
      setCurrentView('dashboard');
      return;
    }
    window.location.hash = `#/${view}`;
    setCurrentView(view);
  };

  // Render active view based on currentView
  if (currentView === 'studio' && role !== 'front-desk') {
    return (
      <Suspense fallback={<FullPageLoadingFallback message="Initializing Report Studio..." />}>
        <ReportStudioPage
          currentView={currentView}
          onNavigate={handleNavigate}
          initialReportData={editingReport}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />
      <main className="flex-1">
        <Suspense fallback={<RouteLoadingFallback />}>
          {currentView === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {currentView === 'workflow' && (
            <WorkflowTrackerPage onNavigate={handleNavigate} onEditReport={handleEditReport} />
          )}
          {currentView === 'print-queue' && <PrintQueuePage onEditReport={handleEditReport} />}
          {currentView === 'users' && role === 'admin' && <UserManagementPage />}
          {currentView === 'audit' && role === 'admin' && <AuditLogPage />}
          {currentView === 'billing' && role === 'admin' && <DoctorBillingPage />}
          {currentView === 'client-portal' && <ClientPortalPage />}
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
