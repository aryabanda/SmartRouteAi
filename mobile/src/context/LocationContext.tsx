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

export function LocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    let watchId: number | undefined;
    let cancelled = false;

    async function attachAddress(current: any) {
      let address: string | undefined;
      try {
        address = await reverseGeocode(
          current.coords.latitude,
          current.coords.longitude,
        );
      } catch (err) {
        console.warn('Reverse geocode failed, using coords without an address:', err);
      }

      if (!cancelled) {
        setLocation({...current, address});
      }
    }

    // One-time fix on mount as a fallback - if the continuous watcher below
    // is slow to fire its first update (or fails entirely), this still
    // gets *something* onto the screen rather than an indefinite null.
    (async () => {
      try {
        const current = await getCurrentLocation();
        await attachAddress(current);
      } catch (err) {
        console.error('getCurrentLocation failed:', err);
      }
    })();

    async function startWatching() {
      try {
        watchId = await watchLocation(async current => {
          await attachAddress(current);
        });
      } catch (err) {
        // This was previously silent - a rejected/thrown watchLocation call
        // would leave `location` stuck at null forever with no visible
        // error anywhere, which is exactly the bug being chased here.
        console.error('watchLocation failed to start:', err);
      }
    }

    startWatching();

    return () => {
      cancelled = true;
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