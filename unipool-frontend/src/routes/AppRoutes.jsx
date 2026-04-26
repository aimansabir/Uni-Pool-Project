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
import FinancialsPage from '../pages/FinancialsPage';

// WF2 pages
import FindRidePage from '../pages/wf2/FindRidePage';
import RideResultsPage from '../pages/wf2/RideResultsPage';
import RoutePreviewPage from '../pages/wf2/RoutePreviewPage';
import MyBookingsPage from '../pages/wf2/MyBookingsPage';
import BookingConfirmedPage from '../pages/wf2/BookingConfirmedPage';
import RideCancelledPage from '../pages/wf2/RideCancelledPage';
import IncomingRequestsPage from '../pages/wf2/IncomingRequestsPage';
import PoolingPage from '../pages/PoolingPage';

// WF3 pages
import ActiveRidePage from '../pages/wf3/ActiveRidePage';
import DriverLiveRidePage from '../pages/wf3/DriverLiveRidePage';
import DriverRateMembersPage from '../pages/wf3/DriverRateMembersPage';
import PassengerTrackRidePage from '../pages/wf3/PassengerTrackRidePage';
import PassengerPaymentRatingPage from '../pages/wf3/PassengerPaymentRatingPage';
import PaymentPage from '../pages/wf3/PaymentPage';

import RatingPage from '../pages/wf3/RatingPage';

// Shared pages
import ProfilePage from '../pages/ProfilePage';
import MessagesPage from '../pages/MessagesPage';
import ChatPage from '../pages/ChatPage';
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
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Vehicles */}
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/vehicles/new" element={<VehicleFormPage />} />
          <Route path="/vehicles/:id/edit" element={<VehicleFormPage />} />

          {/* Rides */}
          <Route path="/rides/publish" element={<PublishRidePage />} />
          <Route path="/rides/find" element={<FindRidePage />} />
          <Route path="/rides/results" element={<RideResultsPage />} />
          <Route path="/rides/:id/preview" element={<RoutePreviewPage />} />
          <Route path="/rides/requests" element={<IncomingRequestsPage />} />
          <Route path="/rides/:id/requests" element={<IncomingRequestsPage />} />
          <Route path="/rides" element={<MyRidesPage />} />
          <Route path="/rides/:id" element={<RideDetailPage />} />
          <Route path="/rides/:id/confirmed" element={<RideConfirmedPage />} />
          <Route path="/rides/:id/manage" element={<RideDetailPage />} />
          <Route path="/rides/:id/live" element={<DriverLiveRidePage />} />
          <Route path="/rides/:id/rate-members" element={<DriverRateMembersPage />} />
          <Route path="/rides/:id/track" element={<PassengerTrackRidePage />} />


          {/* WF3 Ride Execution */}
          <Route path="/active-ride" element={<ActiveRidePage />} />

          <Route path="/payments/:id" element={<PaymentPage />} />
          <Route path="/rides/:id/payment-rating" element={<PassengerPaymentRatingPage />} />
          <Route path="/ratings/:id" element={<RatingPage />} />
          <Route path="/financials" element={<FinancialsPage />} />

          {/* Pooling (unified driver + passenger) */}
          <Route path="/pooling" element={<PoolingPage />} />

          {/* WF2 Booking routes */}
          <Route path="/bookings" element={<MyBookingsPage />} />
          <Route path="/bookings/:id/confirmed" element={<BookingConfirmedPage />} />
          <Route path="/bookings/:id/cancelled" element={<RideCancelledPage />} />

          {/* Notifications */}
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* Profile & Messages & Chat */}
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/chat/:id" element={<ChatPage />} />

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
