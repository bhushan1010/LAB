import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import ReportStudioPage from './pages/ReportStudioPage';
import PublicReportPage from './pages/PublicReportPage';
import DashboardPage from './pages/DashboardPage';
import PrintQueuePage from './pages/PrintQueuePage';
import UserManagementPage from './pages/admin/UserManagementPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import ClientPortalPage from './pages/ClientPortalPage';
import WorkflowTrackerPage from './pages/WorkflowTrackerPage';
import Navbar from './components/layout/Navbar';
import { startBackgroundSync } from './services/syncWorker';

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

      if ((hash === 'users' || hash === 'audit') && role !== 'admin') {
        window.location.hash = '#/dashboard';
        setCurrentView('dashboard');
        return;
      }

      if (hash === 'studio' && role === 'front-desk') {
        window.location.hash = '#/dashboard';
        setCurrentView('dashboard');
        return;
      }

      if (['dashboard', 'studio', 'print-queue', 'users', 'audit', 'client-portal', 'workflow'].includes(hash)) {
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
    return <PublicReportPage />;
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
          <ClientPortalPage />
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
    if ((view === 'users' || view === 'audit') && role !== 'admin') {
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
      <ReportStudioPage
        currentView={currentView}
        onNavigate={handleNavigate}
        initialReportData={editingReport}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar currentView={currentView} onNavigate={handleNavigate} />
      <main className="flex-1">
        {currentView === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}
        {currentView === 'workflow' && (
          <WorkflowTrackerPage onNavigate={handleNavigate} onEditReport={handleEditReport} />
        )}
        {currentView === 'print-queue' && <PrintQueuePage onEditReport={handleEditReport} />}
        {currentView === 'users' && role === 'admin' && <UserManagementPage />}
        {currentView === 'audit' && role === 'admin' && <AuditLogPage />}
        {currentView === 'client-portal' && <ClientPortalPage />}
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
