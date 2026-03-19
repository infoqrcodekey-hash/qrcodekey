// ============================================
// utils/gpsValidator.js - GPS Distance Validation
// ============================================
// Haversine formula for GPS distance calculation

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @param {Number} lat1 - Latitude of point 1
 * @param {Number} lng1 - Longitude of point 1
 * @param {Number} lat2 - Latitude of point 2
 * @param {Number} lng2 - Longitude of point 2
 * @returns {Number} Distance in meters
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Validate if scan location is within allowed radius of organization
 * @param {Object} scanLocation - { lat, lng } of the scanner
 * @param {Object} orgLocation - { lat, lng } of the organization
 * @param {Number} allowedRadius - Allowed radius in meters
 * @returns {Object} { isValid, distance, allowedRadius }
 */
function validateGPSLocation(scanLocation, orgLocation, allowedRadius = 100) {
  // If org has no GPS set, allow all scans
  if (!orgLocation || !orgLocation.lat || !orgLocation.lng) {
    return { isValid: true, distance: 0, allowedRadius, message: 'GPS not configured for organization' };
  }

  // If scan has no GPS, reject
  if (!scanLocation || !scanLocation.lat || !scanLocation.lng) {
    return { isValid: false, distance: null, allowedRadius, message: 'GPS location required for attendance' };
  }

  const distance = calculateDistance(
    scanLocation.lat, scanLocation.lng,
    orgLocation.lat, orgLocation.lng
  );

  const isValid = distance <= allowedRadius;

  return {
    isValid,
    distance: Math.round(distance),
    allowedRadius,
    message: isValid
      ? `Within range (${Math.round(distance)}m of ${allowedRadius}m)`
      : `Too far from organization (${Math.round(distance)}m away, allowed: ${allowedRadius}m)`
  };
}

module.exports = { calculateDistance, validateGPSLocation };
