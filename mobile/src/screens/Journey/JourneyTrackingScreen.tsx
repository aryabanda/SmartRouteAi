import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';

import {useAppLocation} from '../../context/LocationContext';
import {useContacts} from '../../context/ContactsContext';
import {sendSOS} from '../../services/sos';
import {useNavigation} from '@react-navigation/native';
import {recalculateRoute, classifyDeviation} from '../../services/route';
import {CameraRef} from '@maplibre/maplibre-react-native';
import {
  Map,
  Camera,
  UserLocation,
  Marker,
  GeoJSONSource,
  Layer,
} from '@maplibre/maplibre-react-native';

// Free vector tile style, no API key required. Swap for MapTiler/Stadia
// later if you need geocoding/routing bundled in or higher volume.
const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

// ---- Rule-based deviation detection tuning ----
// How far (meters) off the planned route counts as "off route" at all.
const DEVIATION_THRESHOLD_METERS = 60;
// Must stay off-route continuously this long before we call it a real
// deviation (not just GPS jitter or a momentary reading).
const DEVIATION_CONFIRM_MS = 20000;
// If still deviated this long after being confirmed, auto-warn / escalate
// toward SOS. Counted from when it was first off-route, not from confirmation.
const SOS_AUTO_TRIGGER_MS = 60000;

// ---- Checkpoint tuning ----
const NUM_CHECKPOINTS = 5;
const CHECKPOINT_RADIUS_METERS = 100;
const CHECKPOINT_GRACE_MINUTES = 3;

type Coord = {latitude: number; longitude: number};

type Checkpoint = {
  id: number;
  latitude: number;
  longitude: number;
  expectedMinutes: number;
  reached: boolean;
};

type DeviationStatus = 'on_route' | 'monitoring' | 'deviated';

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Flat-earth approximation for short (city-scale) distances - standard and
// easy to justify in a report, no need for a full geodesic library.
function metersPerDegree(lat: number) {
  const latRad = (lat * Math.PI) / 180;
  return {
    lat: 111320,
    lon: 111320 * Math.cos(latRad),
  };
}

// Perpendicular distance (meters) from a point to the nearest segment of
// the planned route polyline. This is the core signal the rule layer runs on.
function distanceToRouteMeters(point: Coord, coords: Coord[]): number {
  if (!coords || coords.length < 2) return Infinity;

  const scale = metersPerDegree(point.latitude);
  const px = point.longitude * scale.lon;
  const py = point.latitude * scale.lat;

  let minDist = Infinity;

  for (let i = 0; i < coords.length - 1; i++) {
    const ax = coords[i].longitude * scale.lon;
    const ay = coords[i].latitude * scale.lat;
    const bx = coords[i + 1].longitude * scale.lon;
    const by = coords[i + 1].latitude * scale.lat;

    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    let t = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const cx = ax + t * dx;
    const cy = ay + t * dy;
    const dist = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);

    if (dist < minDist) minDist = dist;
  }

  return minDist;
}

// Compass bearing (0-360) from point a to point b. Used to measure how
// sharply the user's direction of travel changed since a deviation started -
// a steady turn looks like a deliberate detour, an erratic one doesn't.
function calculateBearing(a: Coord, b: Coord): number {
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function bearingDelta(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// Splits the planned route into evenly-spaced (by distance, not index)
// checkpoints, each carrying the elapsed time by which the user should
// realistically have reached it, based on the route's total ETA.
function buildCheckpoints(
  coords: Coord[] | undefined,
  totalDurationMinutes: number,
): Checkpoint[] {
  if (!coords || coords.length < 2) return [];

  const cumulative: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    const d = calculateDistance(
      coords[i - 1].latitude,
      coords[i - 1].longitude,
      coords[i].latitude,
      coords[i].longitude,
    );
    cumulative.push(cumulative[i - 1] + d);
  }

  const totalDistance = cumulative[cumulative.length - 1];
  if (totalDistance === 0) return [];

  const checkpoints: Checkpoint[] = [];

  for (let i = 1; i <= NUM_CHECKPOINTS; i++) {
    const targetDistance = (totalDistance * i) / NUM_CHECKPOINTS;
    let idx = cumulative.findIndex(d => d >= targetDistance);
    if (idx === -1) idx = coords.length - 1;

    checkpoints.push({
      id: i,
      latitude: coords[idx].latitude,
      longitude: coords[idx].longitude,
      expectedMinutes: (totalDurationMinutes * i) / NUM_CHECKPOINTS,
      reached: false,
    });
  }

  return checkpoints;
}

export default function JourneyTrackingScreen({route}: any) {
  const location = useAppLocation();
  const cameraRef = useRef<CameraRef>(null);
  const {
    destination,
    routeInfo: initialRouteInfo,
    selectedPlace,
  } = route.params ?? {};
  const [routeInfo, setRouteInfo] = useState(initialRouteInfo);
  const [completedRoute, setCompletedRoute] = useState<Coord[]>([]);
const [remainingRoute, setRemainingRoute] = useState<Coord[]>(
  routeInfo?.coordinates ?? [],
);

const lastNearestIndex = useRef(0);

  const [distanceLeft, setDistanceLeft] = useState(
    initialRouteInfo?.distance ?? 0,
  );
  const [eta, setEta] = useState(initialRouteInfo?.duration ?? 0);

  // Lets us pause the page's ScrollView while a finger is down on the map,
  // so panning/zooming the map doesn't fight the page scroll gesture.
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Camera is positioned once on first GPS fix, imperatively (not via
  // conditional mounting) so the ref stays valid and the recenter button
  // always has something to call.
  const hasCenteredRef = useRef(false);

  // ---- Deviation detection state ----
  const [distanceFromRoute, setDistanceFromRoute] = useState(0);
  const [deviationStatus, setDeviationStatus] =
    useState<DeviationStatus>('on_route');
  const offRouteSinceRef = useRef<number | null>(null);
  const sosTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLocationRef = useRef<Coord | null>(null);
  const headingAtDeviationStartRef = useRef<number | null>(null);
  const classifyingRef = useRef(false);

  // ---- Checkpoint state ----
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const journeyStartRef = useRef<number>(Date.now());
  const overdueAlertShownForRef = useRef<number | null>(null);

  const navigation = useNavigation<any>();
  const {contacts} = useContacts();

  // Prevents spamming contacts with repeat SMS if the deviation/checkpoint
  // condition stays true across multiple checks - one SOS per triggered
  // reason per journey, until it's manually reset (e.g. new journey starts).
  const sosSentForRef = useRef<Set<string>>(new Set());

  const triggerSOS = async (
    reason: 'manual' | 'route_deviation' | 'checkpoint_overdue',
  ) => {
    if (!location) {
      Alert.alert('Cannot send SOS', 'Waiting for GPS location.');
      return;
    }
    if (contacts.length === 0) {
      Alert.alert(
        'No emergency contacts',
        'Add at least one emergency contact before starting a journey.',
      );
      return;
    }

    // Manual button press always sends, regardless of the dedup guard.
    if (reason !== 'manual') {
      if (sosSentForRef.current.has(reason)) return;
      sosSentForRef.current.add(reason);
    }

    try {
      const results = await sendSOS(
        contacts,
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        reason,
        destination,
      );
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        Alert.alert(
          'SOS partially sent',
          `Failed to reach: ${failed.map(f => f.contact.name).join(', ')}`,
        );
      } else {
        Alert.alert('SOS Sent', 'Your emergency contacts have been notified.');
      }
    } catch (err: any) {
      Alert.alert('SOS failed', err.message ?? 'Unknown error');
    }
  };

  // NOTE: all Camera imperative calls take a single options object, and the
  // duration field is called `duration` (NOT `animationDuration` - that name
  // was retired in v11). fitBounds's first argument is one flat 4-element
  // tuple [west, south, east, north], not two separate [lng,lat] corners.

  const recenter = () => {
    if (!cameraRef.current || !location) return;
    cameraRef.current.flyTo({
      center: [location.coords.longitude, location.coords.latitude],
      duration: 500,
    });
  };

  const completedGeoJSON: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: completedRoute.map(p => [
      p.longitude,
      p.latitude,
    ]),
  },
};

const remainingGeoJSON: GeoJSON.Feature = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: remainingRoute.map(p => [
      p.longitude,
      p.latitude,
    ]),
  },
};

  // One-time camera centering the first time we get a GPS fix.
  useEffect(() => {
    if (!location || hasCenteredRef.current || !cameraRef.current) return;

    cameraRef.current.flyTo({
      center: [location.coords.longitude, location.coords.latitude],
      zoom: 15,
      duration: 0,
    });
    hasCenteredRef.current = true;
  }, [location]);

  useEffect(() => {
    if (!location || !selectedPlace) return;

    const distance = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      selectedPlace.center[1],
      selectedPlace.center[0],
    );

    setDistanceLeft(distance);
  }, [location, selectedPlace]);

  useEffect(() => {
    if (!location) return;

    const speed = location.coords.speed ?? 0;

    if (speed < 1) {
      return;
    }

    const speedKmPerMin = (speed * 3.6) / 60;

    setEta(distanceLeft / speedKmPerMin);
  }, [distanceLeft, location]);
  useEffect(() => {
  if (!location || !routeInfo?.coordinates?.length) return;

  let nearestIndex = lastNearestIndex.current;
  let nearestDistance = Infinity;

  // Only search forward instead of the whole route
  for (
    let i = lastNearestIndex.current;
    i < routeInfo.coordinates.length;
    i++
  ) {
    const point = routeInfo.coordinates[i];

    const d = calculateDistance(
      location.coords.latitude,
      location.coords.longitude,
      point.latitude,
      point.longitude,
    );

    if (d < nearestDistance) {
      nearestDistance = d;
      nearestIndex = i;
    }
  }

  lastNearestIndex.current = nearestIndex;

  setCompletedRoute(
    routeInfo.coordinates.slice(0, nearestIndex + 1),
  );

  setRemainingRoute(
    routeInfo.coordinates.slice(nearestIndex),
  );
}, [location, routeInfo]);
  useEffect(() => {
    if (!location) return;

    console.log(
      'GPS:',
      location.coords.latitude,
      location.coords.longitude,
      'Speed:',
      location.coords.speed,
    );
  }, [location]);

  useEffect(() => {
    if (!cameraRef.current || !routeInfo?.coordinates?.length) return;

    const lats = routeInfo.coordinates.map((p: any) => p.latitude);
    const lngs = routeInfo.coordinates.map((p: any) => p.longitude);

    cameraRef.current.fitBounds(
      [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)],
      {
        padding: {top: 60, right: 60, bottom: 60, left: 60},
        duration: 1000,
      },
    );
  }, [routeInfo]);

  // Build checkpoints fresh whenever a new route comes in, and reset the
  // journey clock so overdue-checkpoint timing starts from "now".
  useEffect(() => {
    if (!routeInfo?.coordinates?.length) return;

    setCheckpoints(
      buildCheckpoints(routeInfo.coordinates, routeInfo?.duration ?? 0),
    );
    journeyStartRef.current = Date.now();
    overdueAlertShownForRef.current = null;
  }, [routeInfo]);

  // ---- Rule-based deviation detection ----
  // This is the "rule layer" of the hybrid design: pure distance-from-route
  // with a time-based confirmation window to filter out GPS jitter. The
  // spot marked below is where a trained model (e.g. Isolation Forest over
  // {distanceFromRoute, speed, headingChange, timeOffRoute}) would take over
  // to decide "intentional reroute" vs "suspicious deviation" instead of
  // treating every confirmed deviation the same way.
  useEffect(() => {
    if (!location || !routeInfo?.coordinates?.length) return;

    const currentCoord: Coord = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };

    const dist = distanceToRouteMeters(currentCoord, routeInfo.coordinates);
    setDistanceFromRoute(dist);

    if (dist <= DEVIATION_THRESHOLD_METERS) {
      offRouteSinceRef.current = null;
      headingAtDeviationStartRef.current = null;
      if (sosTimerRef.current) {
        clearTimeout(sosTimerRef.current);
        sosTimerRef.current = null;
      }
      setDeviationStatus('on_route');
      prevLocationRef.current = currentCoord;
      return;
    }

    if (!offRouteSinceRef.current) {
      offRouteSinceRef.current = Date.now();
      setDeviationStatus('monitoring');
      // Capture the heading at the moment deviation starts, so we can
      // measure how much it changes by the time we confirm the deviation.
      if (prevLocationRef.current) {
        headingAtDeviationStartRef.current = calculateBearing(
          prevLocationRef.current,
          currentCoord,
        );
      }
      prevLocationRef.current = currentCoord;
      return;
    }

    const offRouteDuration = Date.now() - offRouteSinceRef.current;
    const priorPoint = prevLocationRef.current;
    prevLocationRef.current = currentCoord;

    if (offRouteDuration >= DEVIATION_CONFIRM_MS && !classifyingRef.current) {
      setDeviationStatus('deviated');
      classifyingRef.current = true;

      const speedKph = (location.coords.speed ?? 0) * 3.6;
      // Prefer the device's own compass/course heading when GPS provides
      // one; fall back to a bearing computed from the last two fixes.
      const currentHeading =
        location.coords.heading ??
        (priorPoint ? calculateBearing(priorPoint, currentCoord) : 0);
      const headingChangeDeg =
        headingAtDeviationStartRef.current != null
          ? bearingDelta(headingAtDeviationStartRef.current, currentHeading)
          : 0;

      classifyDeviation({
        distanceFromRoute: dist,
        speedKph,
        headingChangeDeg,
        timeOffRouteMs: offRouteDuration,
      })
        .then(result => {
          console.log('Deviation classified as:', result.label, result.reason);

          if (result.label === 'intentional_reroute') {
            // Silently recalculate instead of alarming the user or contacts.
            // ORS (unlike Google) only accepts coordinates, not place-name
            // strings - if selectedPlace.center is missing for some reason,
            // recalculateRoute below will throw and the .catch already
            // falls back to the SOS path, which is the correct fail-safe.
            if (!selectedPlace?.center) {
              console.warn(
                'No destination coordinates available for recalculation; falling back to SOS path.',
              );
              if (!sosTimerRef.current) {
                sosTimerRef.current = setTimeout(() => {
                  triggerSOS('route_deviation');
                }, 0);
              }
              return;
            }

            const destinationTarget = {
              latitude: selectedPlace.center[1],
              longitude: selectedPlace.center[0],
            };

            recalculateRoute(currentCoord, destinationTarget)
              .then(newRouteInfo => {
                setRouteInfo(newRouteInfo);
                offRouteSinceRef.current = null;
                headingAtDeviationStartRef.current = null;
                setDeviationStatus('on_route');
              })
              .catch(err => {
                console.warn('Recalculation failed, falling back to SOS path:', err.message);
                if (!sosTimerRef.current) {
                  sosTimerRef.current = setTimeout(() => {
                    triggerSOS('route_deviation');
                  }, 0);
                }
              });
          } else {
            // 'suspicious' - proceed to the SOS countdown as before.
            if (!sosTimerRef.current) {
              const remaining = Math.max(0, SOS_AUTO_TRIGGER_MS - offRouteDuration);
              sosTimerRef.current = setTimeout(() => {
                triggerSOS('route_deviation');
              }, remaining);
            }
          }
        })
        .finally(() => {
          classifyingRef.current = false;
        });
    }
  }, [location, routeInfo]);

  // ---- Checkpoint arrival + overdue detection ----
  useEffect(() => {
    if (!location || checkpoints.length === 0) return;

    const elapsedMinutes = (Date.now() - journeyStartRef.current) / 60000;

    setCheckpoints(prev => {
      let changed = false;
      const updated = prev.map(cp => {
        if (cp.reached) return cp;
        const distKm = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          cp.latitude,
          cp.longitude,
        );
        if (distKm * 1000 <= CHECKPOINT_RADIUS_METERS) {
          changed = true;
          return {...cp, reached: true};
        }
        return cp;
      });
      return changed ? updated : prev;
    });

    const overdue = checkpoints.find(
      cp =>
        !cp.reached &&
        elapsedMinutes > cp.expectedMinutes + CHECKPOINT_GRACE_MINUTES,
    );

    if (overdue && overdueAlertShownForRef.current !== overdue.id) {
      overdueAlertShownForRef.current = overdue.id;
      Alert.alert(
        'Checkpoint Overdue',
        `You're behind schedule for checkpoint ${overdue.id} of ${NUM_CHECKPOINTS}. Emergency contacts are being notified.`,
      );
      triggerSOS('checkpoint_overdue');
    }
  }, [location, checkpoints]);

  useEffect(() => {
    return () => {
      if (sosTimerRef.current) clearTimeout(sosTimerRef.current);
    };
  }, []);

  const reachedCount = checkpoints.filter(c => c.reached).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView scrollEnabled={scrollEnabled}>
        <Text style={styles.heading}>ðŸš— Journey in Progress</Text>

        <View
          style={styles.mapContainer}
          onTouchStart={() => setScrollEnabled(false)}
          onTouchEnd={() => setScrollEnabled(true)}
          onTouchCancel={() => setScrollEnabled(true)}
        >
          <Map style={styles.map} mapStyle={MAP_STYLE_URL}>
            <Camera ref={cameraRef} />

            

            {selectedPlace && (
              <Marker
                id="destination"
                lngLat={[selectedPlace.center[0], selectedPlace.center[1]]}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: '#2563EB',
                    borderWidth: 3,
                    borderColor: '#fff',
                  }}
                />
              </Marker>
            )}

            {checkpoints.map(cp => (
              <Marker
                key={cp.id}
                id={`checkpoint-${cp.id}`}
                lngLat={[cp.longitude, cp.latitude]}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: cp.reached ? '#16A34A' : '#F59E0B',
                    borderWidth: 2,
                    borderColor: '#fff',
                  }}
                />
              </Marker>
            ))}

            {routeInfo?.coordinates && (
  <>
    <GeoJSONSource
      id="completedRoute"
      data={completedGeoJSON}
    >
      <Layer
        id="completedLine"
        type="line"
        style={{
          lineColor: '#9CA3AF',
          lineWidth: 6,
          lineOpacity: 0.45,
        }}
      />
    </GeoJSONSource>

    <GeoJSONSource
      id="remainingRoute"
      data={remainingGeoJSON}
    >
      <Layer
        id="remainingLine"
        type="line"
        style={{
          lineColor: '#2563EB',
          lineWidth: 6,
        }}
      />
    </GeoJSONSource>
  </>
)}
<UserLocation />
          </Map>

          <TouchableOpacity style={styles.recenterButton} onPress={recenter}>
            <Text style={styles.recenterText}>ðŸ“</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.row}>Current Location</Text>

          <Text numberOfLines={2}>
            {location?.address ?? 'Getting location...'}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text>Destination </Text>
            <Text numberOfLines={3}>{destination}</Text>
          </View>

          <View style={styles.row}>
            <Text>Distance Left</Text>
            <Text>{distanceLeft.toFixed(2)} km</Text>
          </View>

          <View style={styles.row}>
            <Text>ETA</Text>
            <Text>{eta > 0 ? `${eta.toFixed(0)} mins` : '-- mins'}</Text>
          </View>

          <View style={styles.row}>
            <Text>Speed</Text>
            <Text>
              {location?.coords?.speed != null
                ? `${(location.coords.speed * 3.6).toFixed(1)} km/h`
                : '0 km/h'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text>Checkpoints</Text>
            <Text>
              {reachedCount} / {NUM_CHECKPOINTS}
            </Text>
          </View>

          <View style={styles.row}>
            <Text>Safety</Text>
            <Text>{deviationStatus === 'deviated' ? '62%' : '98%'}</Text>
          </View>
        </View>

        <View style={styles.aiCard}>
          <Text style={styles.aiTitle}>ðŸ¤– AI Status</Text>

          <Text>
            {deviationStatus === 'on_route' ? 'âœ“' : 'âš '} On Route
            {deviationStatus !== 'on_route'
              ? ` (${distanceFromRoute.toFixed(0)}m off)`
              : ''}
          </Text>

          <Text>
            {deviationStatus === 'deviated'
              ? ' Deviation Confirmed'
              : deviationStatus === 'monitoring'
              ? ' Monitoring Possible Deviation'
              : ' No Deviation'}
          </Text>

          <Text>âœ“ Traffic Normal</Text>
        </View>

        <TouchableOpacity
          style={styles.sos}
          onPress={() => {
            Alert.alert(
              'Send Emergency SOS?',
              'This will text your live location to all emergency contacts.',
              [
                {text: 'Cancel', style: 'cancel'},
                {
                  text: 'Send SOS',
                  style: 'destructive',
                  onPress: () => triggerSOS('manual'),
                },
              ],
            );
          }}
        >
          <Text style={styles.sosText}>ðŸš¨ Emergency SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.sosText}>End Journey</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
    padding: 20,
  },

  heading: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },

  mapContainer: {
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },

  recenterButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 2},
  },

  recenterText: {
    fontSize: 20,
  },

  map: {
    flex: 1,
    width: '100%',
  },

  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },

  aiCard: {
    backgroundColor: '#EEF4FF',
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
  },

  aiTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 10,
  },

  sos: {
    backgroundColor: '#DC2626',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    marginBottom: 15,
  },

  sosText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },

  endButton: {
    backgroundColor: '#111827',
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
  },

  endText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});
