import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LocationProvider } from './context/LocationContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <LocationProvider>
          <AppRoutes />
        </LocationProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
