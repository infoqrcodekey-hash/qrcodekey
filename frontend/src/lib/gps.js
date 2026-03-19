// ============================================
// lib/gps.js - GPS Location Capture
// ============================================
// Uses Browser Geolocation API
// Fallback strategies when GPS fails

// ====== Get Current Location ======
// Returns: { latitude, longitude, accuracy, altitude, source }
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    // Check: Browser supports Geolocation?
    if (!navigator.geolocation) {
      console.warn('⚠️ Geolocation not supported');
      resolve(getFallbackLocation());
      return;
    }

    // GPS Request - High Accuracy
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          source: 'gps',
          timestamp: position.timestamp,
        });
      },
      (error) => {
        console.warn('⚠️ GPS Error:', error.message);
        
        // GPS fail → Try low accuracy
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              source: 'wifi',
              timestamp: position.timestamp,
            });
          },
          (fallbackError) => {
            console.warn('⚠️ Fallback GPS also failed:', fallbackError.message);
            // Server will use IP-based location
            resolve(getFallbackLocation());
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 300000, // 5 min cache OK
          }
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,  // 1 min cache
      }
    );
  });
};

// ====== Watch Location (Continuous) ======
export const watchLocation = (callback) => {
  if (!navigator.geolocation) return null;

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      callback({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'gps',
        timestamp: position.timestamp,
      });
    },
    (error) => {
      console.warn('Watch Error:', error.message);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 15000,
    }
  );

  // Return cleanup function
  return () => navigator.geolocation.clearWatch(watchId);
};

// ====== Fallback Location ======
// When both GPS and WiFi fail
function getFallbackLocation() {
  return {
    latitude: 0,
    longitude: 0,
    accuracy: null,
    altitude: null,
    source: 'fallback',
    timestamp: Date.now(),
  };
}

// ====== Request Permission ======
export const requestLocationPermission = async () => {
  try {
    if (navigator.permissions) {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state; // 'granted', 'prompt', 'denied'
    }
    return 'prompt';
  } catch {
    return 'prompt';
  }
};

// ====== Distance Between Two Points (km) ======
export const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
