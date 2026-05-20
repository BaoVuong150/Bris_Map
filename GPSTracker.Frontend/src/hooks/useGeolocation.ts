import { useState, useEffect } from 'react';

interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  error: string | null;
}

export const useGeolocation = () => {
  const [location, setLocation] = useState<LocationState>({
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    error: null,
  });

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    // Set up continuous location tracking
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          error: null,
        });
      },
      (error) => {
        setLocation(prev => ({ ...prev, error: error.message }));
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );

    // Cleanup subscription on unmount
    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  return location;
};
