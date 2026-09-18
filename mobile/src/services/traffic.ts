import {getRoute} from './route';

export async function refreshTrafficRoute(
  origin: {
    latitude: number;
    longitude: number;
  },
  destination: {
    latitude: number;
    longitude: number;
  },
) {
  return getRoute(origin, destination);
}