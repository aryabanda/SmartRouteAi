import {useState} from 'react';
import {searchPlace} from '../services/search';

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
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function useSearch() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(
    query: string,
    latitude?: number,
    longitude?: number,
  ) {
    setLoading(true);

    try {
      let places = await searchPlace(query, latitude, longitude);

      if (latitude !== undefined && longitude !== undefined) {
        places = places.map((place: any) => ({
          ...place,
          distance: calculateDistance(
            latitude,
            longitude,
            place.center[1],
            place.center[0],
          ),
        }));

        places.sort((a: any, b: any) => a.distance - b.distance);
      }

      setResults(places);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }
    function clearResults() {
      setResults([]);
    }
  return {
    results,
    loading,
    search,
    clearResults,
  };
}