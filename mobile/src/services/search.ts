import axios from 'axios';

// Same LAN-IP caveat as services/route.ts - set this to your dev machine's
// LAN IP, not localhost, so a phone/emulator can actually reach it.
const BACKEND_URL = 'http://localhost:4000'; // <-- change this

export async function searchPlace(
  query: string,
  latitude?: number,
  longitude?: number,
) {
  if (!query.trim()) return [];

  try {
     console.log("calling backend");
    console.log("Calling:", `${BACKEND_URL}/api/search`);
    const response = await axios.get(`${BACKEND_URL}/api/search`, {
      params: {
        query,
        ...(latitude !== undefined &&
          longitude !== undefined && {latitude, longitude}),
      },
    });

    console.log('Search Response:', response.data);

    return response.data.features;
  } catch (error) {
    console.log('Search Error:', error);
    return [];
  }
}
