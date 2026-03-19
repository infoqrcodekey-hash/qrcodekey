// ============================================
// components/MapView.js - Google Maps Component
// ============================================
// Uses Google Maps JavaScript API
// Dynamic import (ssr: false) se use karo

import { useEffect, useRef, useState } from 'react';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return; }

    // Check if script is already loading
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      const check = setInterval(() => {
        if (window.google?.maps) { clearInterval(check); resolve(window.google.maps); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error('Google Maps timeout')); }, 10000);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Google Maps not available'));
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
}

export default function MapView({ locations = [], selectedScan, onSelectScan, qrInfo }) {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);
  const infoWindowRef = useRef(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (googleMapRef.current) return;

    if (!GOOGLE_MAPS_KEY) {
      setMapError(true);
      return;
    }

    loadGoogleMaps().then(maps => {
      const map = new maps.Map(mapRef.current, {
        center: { lat: 20.5937, lng: 78.9629 }, // India
        zoom: 5,
        mapId: 'qrcodekey-dark',
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#8b8ba7' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a4a' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a3e' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a3a5e' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1a2b' }] },
          { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d8c' }] },
          { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1e1e3e' }] },
          { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6b6b8a' }] },
          { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e1e3e' }] },
          { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#2a2a4a' }] },
        ],
      });

      infoWindowRef.current = new maps.InfoWindow();
      googleMapRef.current = map;
      addMarkers(maps, map, locations);
    }).catch(err => {
      console.error('Google Maps load error:', err);
      setMapError(true);
    });

    return () => {
      clearMarkers();
      googleMapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!googleMapRef.current || locations.length === 0) return;
    loadGoogleMaps().then(maps => {
      addMarkers(maps, googleMapRef.current, locations);
    });
  }, [locations]);

  useEffect(() => {
    if (!googleMapRef.current || !selectedScan) return;
    if (selectedScan.latitude && selectedScan.longitude) {
      googleMapRef.current.panTo({ lat: selectedScan.latitude, lng: selectedScan.longitude });
      googleMapRef.current.setZoom(14);
    }
  }, [selectedScan]);

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) { polylineRef.current.setMap(null); polylineRef.current = null; }
  };

  const addMarkers = (maps, map, locs) => {
    clearMarkers();

    const validLocs = locs.filter(l => l.latitude && l.longitude && l.latitude !== 0);
    if (validLocs.length === 0) return;

    const bounds = new maps.LatLngBounds();
    const path = [];

    validLocs.forEach((loc, i) => {
      const isLatest = i === 0;
      const position = { lat: loc.latitude, lng: loc.longitude };
      bounds.extend(position);
      path.push(position);

      const marker = new maps.Marker({
        position,
        map,
        icon: {
          path: isLatest ? maps.SymbolPath.BACKWARD_CLOSED_ARROW : maps.SymbolPath.CIRCLE,
          scale: isLatest ? 8 : 5,
          fillColor: isLatest ? '#6366f1' : '#818cf8',
          fillOpacity: isLatest ? 1 : 0.7,
          strokeColor: '#ffffff',
          strokeWeight: isLatest ? 2.5 : 1.5,
          rotation: 0,
        },
        zIndex: isLatest ? 100 : 50 - i,
        title: `${isLatest ? 'Latest Scan' : `Scan #${i + 1}`} - ${loc.address?.city || 'Unknown'}`,
      });

      marker.addListener('click', () => {
        if (onSelectScan) onSelectScan(loc);

        const content = `
          <div style="font-family:'Segoe UI',sans-serif;min-width:180px;padding:4px;color:#1a1a2e">
            <div style="font-weight:bold;font-size:13px;color:#4338ca;margin-bottom:6px">
              ${isLatest ? '🔴 Latest Scan' : `📍 Scan #${i + 1}`}
            </div>
            <div style="font-size:12px;margin-bottom:3px">
              📍 ${loc.address?.city || 'Unknown'}${loc.address?.country ? ', ' + loc.address.country : ''}
            </div>
            <div style="font-size:11px;color:#666;margin-bottom:3px">
              📱 ${loc.device?.deviceType || 'Device'} | ${loc.device?.os || 'OS'}
            </div>
            <div style="font-size:11px;color:#666">
              ⏰ ${new Date(loc.scannedAt).toLocaleString('en-IN')}
            </div>
            ${loc.isApproximate ? '<div style="font-size:11px;color:#d97706;margin-top:3px">⚠️ Approximate location</div>' : ''}
            ${loc.accuracy ? `<div style="font-size:10px;color:#888;margin-top:2px">Accuracy: ±${Math.round(loc.accuracy)}m</div>` : ''}
          </div>
        `;

        infoWindowRef.current.setContent(content);
        infoWindowRef.current.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Draw polyline connecting all points
    if (path.length > 1) {
      polylineRef.current = new maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#6366f1',
        strokeOpacity: 0.5,
        strokeWeight: 2,
        icons: [{
          icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.5, scale: 3 },
          offset: '0',
          repeat: '15px',
        }],
        map,
      });
    }

    // Fit bounds
    if (validLocs.length === 1) {
      map.setCenter(path[0]);
      map.setZoom(13);
    } else {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  };

  // Error fallback
  if (mapError) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-[#1a1a2e]">
        <div className="text-center p-6">
          <span className="text-4xl block mb-3">🗺️</span>
          <p className="text-sm text-gray-400 mb-2">Google Maps API key not configured</p>
          <p className="text-[10px] text-gray-600">Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to your .env.local</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {locations.length > 0 && (
        <div className="absolute top-3 right-3 z-10 bg-[rgba(15,15,45,0.9)] border border-indigo-500/30 rounded-xl px-3 py-2 text-[10px] text-gray-300 font-bold shadow-xl">
          📍 {locations.filter(l => l.latitude).length} locations
        </div>
      )}

      {locations.filter(l => l.latitude).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-[rgba(15,15,45,0.9)] border border-indigo-500/20 rounded-2xl p-6 text-center">
            <span className="text-3xl block mb-2">🗺️</span>
            <p className="text-sm text-gray-400">No GPS locations found yet</p>
            <p className="text-[10px] text-gray-600 mt-1">When QR is scanned with GPS, it will show on the map</p>
          </div>
        </div>
      )}
    </div>
  );
}
