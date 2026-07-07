import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import LandingPage from '../pages/LandingPage';
import { AuthLayout } from '../components/layout/AuthLayout';
import { AppLayout } from '../components/layout/AppLayout';
import { Spinner } from '../components/common/Spinner';

const LoginPage = lazy(() => import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('../pages/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const WorkspacesPage = lazy(() => import('../pages/WorkspacesPage').then((module) => ({ default: module.WorkspacesPage })));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })));
const ProjectDetailsPage = lazy(() => import('../pages/ProjectDetailsPage').then((module) => ({ default: module.ProjectDetailsPage })));
const EvaluationPage = lazy(() => import('../pages/EvaluationPage').then((module) => ({ default: module.EvaluationPage })));
const ApprovalsPage = lazy(() => import('../pages/ApprovalsPage').then((module) => ({ default: module.ApprovalsPage })));
const BillingPage = lazy(() => import('../pages/BillingPage').then((module) => ({ default: module.BillingPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

const routeFallback = (
  <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]">
    <Spinner />
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={routeFallback}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={(
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          )}
        />
        <Route
          path="/register"
          element={(
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          )}
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/workspaces" element={<WorkspacesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
            <Route path="/evaluation" element={<EvaluationPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};
