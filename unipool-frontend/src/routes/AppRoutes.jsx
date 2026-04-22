import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from './ProtectedRoute';

// Auth pages
import SplashPage from '../pages/auth/SplashPage';
import OnboardingPage from '../pages/auth/OnboardingPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import VerifyPage from '../pages/auth/VerifyPage';
import RoleSelectPage from '../pages/auth/RoleSelectPage';
import EnableLocationPage from '../pages/auth/EnableLocationPage';
import { GlobalToaster } from '../context/ToastContext';

// WF1 pages
import DashboardPage from '../pages/wf1/DashboardPage';
import VehiclesPage from '../pages/wf1/VehiclesPage';
import VehicleFormPage from '../pages/wf1/VehicleFormPage';
import PublishRidePage from '../pages/wf1/PublishRidePage';
import RideConfirmedPage from '../pages/wf1/RideConfirmedPage';
import MyRidesPage from '../pages/wf1/MyRidesPage';
import RideDetailPage from '../pages/wf1/RideDetailPage';
import NotificationsPage from '../pages/wf1/NotificationsPage';
import ExploreMapPage from '../pages/wf1/ExploreMapPage';

// Shared pages
import ProfilePage from '../pages/ProfilePage';
import MessagesPage from '../pages/MessagesPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Splash — entry point */}
        <Route
          path="/"
          element={
            <div className="app-shell">
              <GlobalToaster />
              <SplashPage />
            </div>
          }
        />

        {/* Public auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/enable-location" element={<EnableLocationPage />} />
        </Route>

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/select-role" element={<RoleSelectPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Vehicles */}
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/vehicles/new" element={<VehicleFormPage />} />
          <Route path="/vehicles/:id/edit" element={<VehicleFormPage />} />

          {/* Rides */}
          <Route path="/rides/publish" element={<PublishRidePage />} />
          <Route path="/rides" element={<MyRidesPage />} />
          <Route path="/rides/:id" element={<RideDetailPage />} />
          <Route path="/rides/:id/confirmed" element={<RideConfirmedPage />} />

          {/* Notifications */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Profile & Messages */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/messages" element={<MessagesPage />} />

          {/* Map */}
          <Route path="/map" element={<ExploreMapPage />} />
          <Route path="/search" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
