import axios from 'axios';

export async function reverseGeocode(
  latitude: number,
  longitude: number,
) {
  try {
    const response = await axios.get(
      'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          lat: latitude,
          lon: longitude,
          format: 'jsonv2',
        },
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SmartRouteAI/1.0',
        },
      },
    );

    return response.data.display_name;
  } catch (error) {
    console.log('Reverse Geocode Error:', error);
    return 'Unknown Location';
  }
}