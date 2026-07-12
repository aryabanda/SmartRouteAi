import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

import {getCurrentLocation} from '../services/location';
import {reverseGeocode} from '../services/geocoding';
import {
  watchLocation,
  stopWatchingLocation,
} from '../services/location';

const LocationContext = createContext<any>(null);
console.log("Hi");
export function LocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
  let watchId: number;

  async function startWatching() {
    watchId = await watchLocation(async current => {
      const address = await reverseGeocode(
        current.coords.latitude,
        current.coords.longitude,
      );

      setLocation({
        ...current,
        address,
      });
    });
  }

  startWatching();

  return () => {
    if (watchId !== undefined) {
      stopWatchingLocation(watchId);
    }
  };
}, []);

  return (
    <LocationContext.Provider value={location}>
      {children}
    </LocationContext.Provider>
  );
}

export function useAppLocation() {
  return useContext(LocationContext);
}