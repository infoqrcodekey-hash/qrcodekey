// ============================================
// components/MapView.js - Leaflet Map Component
// ============================================
// Uses OpenStreetMap + Leaflet (FREE - no API key needed)
// Dynamic import (ssr: false) se use karo

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue with Next.js
const createIcon = (color, size) => {
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:2px solid white;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

const latestIcon = L.divIcon({
  html: `<div style="
    width:20px;height:20px;
    background:#ef4444;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 12px rgba(239,68,68,0.6), 0 2px 8px rgba(0,0,0,0.4);
    animation: pulse 1.5s infinite;
  "></div>
  <style>@keyframes pulse{0%,100%{box-shadow:0 0 12px rgba(239,68,68,0.6)}50%{box-shadow:0 0 24px rgba(239,68,68,0.9)}}</style>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

const normalIcon = createIcon('#6366f1', 12);

export default function MapView({ locations = [], selectedScan, onSelectScan, qrInfo }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markersRef = useRef([]);
  const polylineRef = useRef(null);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (leafletMapRef.current) return;

    const map = L.map(mapRef.current, {
      center: [20.5937, 78.9629], // India center
      zoom: 5,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    leafletMapRef.current = map;

    // Add markers if locations already available
    if (locations.length > 0) {
      addMarkers(map, locations);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    if (!leafletMapRef.current || locations.length === 0) return;
    addMarkers(leafletMapRef.current, locations);
  }, [locations]);

  // Pan to selected scan
  useEffect(() => {
    if (!leafletMapRef.current || !selectedScan) return;
    if (selectedScan.latitude && selectedScan.longitude) {
      leafletMapRef.current.flyTo([selectedScan.latitude, selectedScan.longitude], 14, {
        duration: 0.8,
      });
    }
  }, [selectedScan]);

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
  };

  const addMarkers = (map, locs) => {
    clearMarkers();

    const validLocs = locs.filter(l => l.latitude && l.longitude && l.latitude !== 0);
    if (validLocs.length === 0) return;

    const path = [];

    validLocs.forEach((loc, i) => {
      const isLatest = i === 0;
      const position = [loc.latitude, loc.longitude];
      path.push(position);

      const marker = L.marker(position, {
        icon: isLatest ? latestIcon : normalIcon,
        zIndexOffset: isLatest ? 1000 : 500 - i,
      }).addTo(map);

      const popupContent = `
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

      marker.bindPopup(popupContent, {
        maxWidth: 250,
        className: 'qr-map-popup',
      });

      marker.on('click', () => {
        if (onSelectScan) onSelectScan(loc);
      });

      markersRef.current.push(marker);
    });

    // Draw polyline connecting all points
    if (path.length > 1) {
      polylineRef.current = L.polyline(path, {
        color: '#6366f1',
        weight: 2,
        opacity: 0.5,
        dashArray: '8, 8',
      }).addTo(map);
    }

    // Fit bounds
    if (validLocs.length === 1) {
      map.setView(path[0], 13);
    } else {
      const bounds = L.latLngBounds(path);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} style={{ width: '100%', height: '100%', background: '#1a1a2e' }} />

      {locations.length > 0 && (
        <div className="absolute top-3 right-3 z-[1000] bg-[rgba(15,15,45,0.9)] border border-indigo-500/30 rounded-xl px-3 py-2 text-[10px] text-gray-300 font-bold shadow-xl">
          📍 {locations.filter(l => l.latitude).length} locations
        </div>
      )}

      {locations.filter(l => l.latitude).length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none">
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
