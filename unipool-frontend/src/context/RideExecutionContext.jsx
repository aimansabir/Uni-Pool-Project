import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import useRideTracking from '../hooks/useRideTracking';
import useRideExecutionActions from '../hooks/useRideExecutionActions';

const RideExecutionContext = createContext(null);

export function RideExecutionProvider({ children, rideId, isDriver }) {
  const { trackingData, refresh, updateDriverLocation } = useRideTracking(rideId, isDriver);
  const actions = useRideExecutionActions();
  const navigate = useNavigate();

  // The tracking payload acts as our localized 'ride' state.
  const ride = trackingData;

  const value = {
    rideId,
    ride,
    isDriver,
    refresh,
    updateDriverLocation,
    ...actions,
  };

  return (
    <RideExecutionContext.Provider value={value}>
      {children}
    </RideExecutionContext.Provider>
  );
}

export function useRideExecution() {
  const context = useContext(RideExecutionContext);
  if (!context) {
    throw new Error('useRideExecution must be used within a RideExecutionProvider');
  }
  return context;
}
