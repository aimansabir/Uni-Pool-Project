import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    status: 'prompt', // 'prompt', 'granted', 'denied'
    error: null,
  });

  const checkPermission = useCallback(async () => {
    if (!navigator.permissions || !navigator.permissions.query) return;

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      setLocation(prev => ({ ...prev, status: result.state }));
      
      // If already granted, fetch coordinates immediately
      if (result.state === 'granted') {
        requestLocation().catch(() => {});
      }

      result.onchange = () => {
        setLocation(prev => ({ ...prev, status: result.state }));
        if (result.state === 'granted') {
          requestLocation().catch(() => {});
        }
      };
    } catch (err) {
      console.error('Error checking location permission:', err);
    }
  }, []);

  const requestLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const err = 'Geolocation is not supported by your browser';
        setLocation(prev => ({ ...prev, error: err, status: 'denied' }));
        return reject(err);
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            status: 'granted',
            error: null,
          };
          setLocation(newLocation);
          resolve(newLocation);
        },
        (error) => {
          let errorMsg = 'Failed to get location';
          if (error.code === error.PERMISSION_DENIED) {
            errorMsg = 'Location permission denied';
            setLocation(prev => ({ ...prev, status: 'denied', error: errorMsg }));
          } else {
            setLocation(prev => ({ ...prev, error: errorMsg }));
          }
          reject(errorMsg);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  return (
    <LocationContext.Provider value={{ ...location, requestLocation, checkPermission }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
