import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LocationProvider } from './context/LocationContext';
import AppRoutes from './routes/AppRoutes';
import { GlobalToaster } from './context/ToastContext';

import NotificationStream from './components/NotificationStream';

export default function App() {
  return (
    <ToastProvider>
      <GlobalToaster />
      <AuthProvider>
        <NotificationStream />
        <LocationProvider>
          <AppRoutes />
        </LocationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
