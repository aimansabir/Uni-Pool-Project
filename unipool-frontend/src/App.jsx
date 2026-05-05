import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LocationProvider } from './context/LocationContext';
import AppRoutes from './routes/AppRoutes';
import { GlobalToaster } from './context/ToastContext';

export default function App() {
  return (
    <ToastProvider>
      <GlobalToaster />
      <AuthProvider>
        <LocationProvider>
          <AppRoutes />
        </LocationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
