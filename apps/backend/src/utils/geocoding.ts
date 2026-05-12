/**
 * Shared geocoding helper — TASK-073
 *
 * Converts a city name to latitude/longitude via the Open-Meteo Geocoding API.
 * Used by both the weather route (TASK-070) and the soil-moisture route (TASK-073).
 */

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

interface GeocodingResult {
  results?: Array<{
    name:      string;
    latitude:  number;
    longitude: number;
    country?:  string;
  }>;
}

export interface GeoCoords {
  lat: number;
  lon: number;
}

/**
 * Geocodes a city name to coordinates.
 *
 * @returns GeoCoords when the city is found, or null when not found.
 * @throws  Error when the upstream Geocoding API returns an HTTP error.
 */
export async function geocodeCity(city: string): Promise<GeoCoords | null> {
  const res = await fetch(
    `${GEOCODING_URL}?name=${encodeURIComponent(city)}&count=1&language=de&format=json`,
  );

  if (!res.ok) {
    throw new Error(`Geocoding API error: ${res.status}`);
  }

  const data = await res.json() as GeocodingResult;

  if (!data.results || data.results.length === 0) {
    return null;
  }

  return { lat: data.results[0].latitude, lon: data.results[0].longitude };
}
