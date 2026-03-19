// ============================================
// services/locationService.js
// ============================================
// Provides IP-based location when GPS fails
// Manages last known location

// ====== Get Location from IP Address ======
exports.getLocationFromIP = (ipAddress) => {
  try {
    // geoip-lite uses offline database (free, no API needed)
    const geoip = require('geoip-lite');
    
    // Handle Localhost / Private IPs
    if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      // Development mode: Default location
      if (process.env.NODE_ENV === 'development') {
        return {
          lat: 28.6139,
          lng: 77.2090,
          city: 'New Delhi (Dev)',
          region: 'Delhi',
          country: 'IN',
          timezone: 'Asia/Kolkata'
        };
      }
      return null;
    }

    const geo = geoip.lookup(ipAddress);
    
    if (geo && geo.ll) {
      return {
        lat: geo.ll[0],
        lng: geo.ll[1],
        city: geo.city || 'Unknown',
        region: geo.region || 'Unknown',
        country: geo.country || 'Unknown',
        timezone: geo.timezone || null
      };
    }

    return null;

  } catch (error) {
    console.error('GeoIP Error:', error.message);
    return null;
  }
};

// ====== Calculate Distance (between 2 GPS points) ======
// Haversine formula - distance in km
exports.calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// ====== Validate Location ======
exports.isValidLocation = (lat, lng) => {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (lat === 0 && lng === 0) return false;  // Null Island (invalid)
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  return true;
};

// ====== Accuracy Check ======
// Warning if GPS accuracy exceeds 100m
exports.getAccuracyLevel = (accuracy) => {
  if (!accuracy) return 'unknown';
  if (accuracy <= 10) return 'high';       // GPS
  if (accuracy <= 100) return 'medium';    // WiFi
  if (accuracy <= 1000) return 'low';      // Cell Tower
  return 'very_low';                        // IP based
};
