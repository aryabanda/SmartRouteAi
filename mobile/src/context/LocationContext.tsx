import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from 'react';

import {
  getCurrentLocation,
  watchLocation,
  stopWatchingLocation,
} from '../services/location';

import {reverseGeocode} from '../services/geocoding';

const LocationContext = createContext<any>(null);

export function LocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useState<any>(null);

  // Prevent reverse-geocoding on every GPS update.
  const lastGeocodeTimeRef = useRef(0);

  // Keep the latest address available when a new GPS fix arrives.
  const lastAddressRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let watchId: number | undefined;
    let cancelled = false;

    async function handleLocation(current: any) {
      if (cancelled) return;

      // --------------------------------------------------
      // 1. UPDATE GPS IMMEDIATELY
      // --------------------------------------------------
      //
      // This is the important part.
      //
      // Speed, coordinates, heading, timestamp, etc.
      // should NOT wait for reverse geocoding.
      //
      setLocation({
        ...current,
        address: lastAddressRef.current,
      });

      // --------------------------------------------------
      // 2. THROTTLE REVERSE GEOCODING
      // --------------------------------------------------

      const now = Date.now();

      // Only reverse-geocode once every 15 seconds.
      if (now - lastGeocodeTimeRef.current < 15000) {
        return;
      }

      lastGeocodeTimeRef.current = now;

      try {
        const address = await reverseGeocode(
          current.coords.latitude,
          current.coords.longitude,
        );

        if (cancelled) return;

        lastAddressRef.current = address;

        // Update ONLY the address.
        // GPS data remains from the latest fix.
        setLocation((prev:any) => ({
          ...(prev ?? current),
          address,
        }));
      } catch (err) {
        console.warn(
          'Reverse geocode failed, keeping latest GPS:',
          err,
        );
      }
    }

    // --------------------------------------------------
    // INITIAL LOCATION
    // --------------------------------------------------

    (async () => {
      try {
        const current = await getCurrentLocation();

        if (!cancelled) {
          await handleLocation(current);
        }
      } catch (err) {
        console.error(
          'getCurrentLocation failed:',
          err,
        );
      }
    })();

    // --------------------------------------------------
    // CONTINUOUS GPS WATCHER
    // --------------------------------------------------

    async function startWatching() {
      try {
        watchId = await watchLocation(current => {
          // Do NOT await reverse geocoding here.
          //
          // GPS update is processed immediately.
          void handleLocation(current);
        });
      } catch (err) {
        console.error(
          'watchLocation failed to start:',
          err,
        );
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