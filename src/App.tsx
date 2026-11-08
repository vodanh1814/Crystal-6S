import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './i18n/context';
import { Layout } from './components/Layout';
import { resolveColorMode } from './lib/theme';
import { Loader2 } from 'lucide-react';

const Login = React.lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Setup = React.lazy(() => import('./pages/Setup').then((m) => ({ default: m.Setup })));
const Dashboard = React.lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const AuditsList = React.lazy(() => import('./pages/AuditsList').then((m) => ({ default: m.AuditsList })));
const AuditDetail = React.lazy(() => import('./pages/AuditDetail').then((m) => ({ default: m.AuditDetail })));
const FindingsList = React.lazy(() => import('./pages/FindingsList').then((m) => ({ default: m.FindingsList })));
const FindingDetail = React.lazy(() => import('./pages/FindingDetail').then((m) => ({ default: m.FindingDetail })));
const Reports = React.lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const AdminAreas = React.lazy(() => import('./pages/AdminAreas').then((m) => ({ default: m.AdminAreas })));
const AdminUsers = React.lazy(() => import('./pages/AdminUsers').then((m) => ({ default: m.AdminUsers })));
const AdminChecklist = React.lazy(() => import('./pages/AdminChecklist').then((m) => ({ default: m.AdminChecklist })));
const AdminTargets = React.lazy(() => import('./pages/AdminTargets').then((m) => ({ default: m.AdminTargets })));
const Profile = React.lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));

const PageLoader = () => (
  <div className="py-20 flex items-center justify-center">
    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
  children,
  adminOnly = false,
}) => {
  const { user, loading, isAdmin, activeTheme, colorModeOverride } = useAuth();
  const resolvedMode = resolveColorMode(activeTheme, colorModeOverride, false);

  if (loading) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${
          resolvedMode === 'dark' ? 'bg-[#070b14]' : 'bg-slate-50'
        }`}
      >
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/setup" element={<Setup />} />

              {/* Default public route: Dashboard (TV / shop-floor overview) */}
              <Route
                path="/"
                element={
                  <Layout>
                    <Dashboard />
                  </Layout>
                }
              />
              <Route
                path="/reports"
                element={
                  <Layout>
                    <Reports />
                  </Layout>
                }
              />
              <Route
                path="/findings"
                element={
                  <Layout>
                    <FindingsList />
                  </Layout>
                }
              />
              <Route
                path="/findings/:id"
                element={
                  <Layout>
                    <FindingDetail />
                  </Layout>
                }
              />
              {/* Authenticated user routes */}
              <Route
                path="/audits"
                element={
                  <ProtectedRoute>
                    <AuditsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audits/:id"
                element={
                  <ProtectedRoute>
                    <AuditDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Admin only routes */}
              <Route
                path="/admin/areas"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminAreas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/checklist"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminChecklist />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/targets"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminTargets />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
