/**
 * Geo Service for FoodBridge
 * Handles browser Geolocation API and reverse geocoding via OpenStreetMap / Nominatim.
 * No private API keys required; respectful of rate limits and privacy.
 */

export const geoService = {
  /**
   * Request single-shot current location from browser Geolocation API.
   * @param {Object} options - Geolocation position options
   * @returns {Promise<{latitude: number, longitude: number}>}
   */
  getCurrentCoordinates: (options = { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }) => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation is not supported by your browser.'));
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let message = 'Could not detect location.';
          if (error.code === error.PERMISSION_DENIED) {
            message = 'Location permission was blocked. You can enter the pickup address manually.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            message = 'Location information is unavailable on your device.';
          } else if (error.code === error.TIMEOUT) {
            message = 'Location request timed out. Please try again or enter manually.';
          }
          reject(new Error(message));
        },
        options
      );
    });
  },

  /**
   * Reverse geocodes latitude and longitude into postal address components using OpenStreetMap Nominatim.
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<{street: string, city: string, state: string, postalCode: string, displayName: string} | null>}
   */
  reverseGeocode: async (latitude, longitude) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (!data || !data.address) {
        return null;
      }

      const addr = data.address;

      // Extract street address parts
      const streetParts = [
        addr.house_number,
        addr.building || addr.amenity || addr.shop,
        addr.road || addr.pedestrian || addr.street || addr.neighbourhood || addr.suburb,
      ].filter(Boolean);

      const street = streetParts.length > 0
        ? streetParts.join(', ')
        : (data.display_name ? data.display_name.split(',').slice(0, 2).join(',').trim() : '');

      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
      const state = addr.state || addr.state_district || addr.region || '';
      const postalCode = addr.postcode || addr.postal_code || '';

      return {
        street,
        city,
        state,
        postalCode,
        displayName: data.display_name || '',
      };
    } catch {
      // Graceful fallback when reverse geocoding is unavailable or network fails
      return null;
    }
  },
};
