import { useParams, Outlet } from 'react-router-dom';
import { RideExecutionProvider } from '../../context/RideExecutionContext';

export function DriverRideRouteWrapper() {
  const { rideId } = useParams();
  
  // Enforces that these driver pages inherently have access to RideExecutionContext
  return (
    <RideExecutionProvider rideId={rideId} isDriver={true}>
      <Outlet />
    </RideExecutionProvider>
  );
}
