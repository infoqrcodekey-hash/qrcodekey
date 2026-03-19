module.exports = [
"[project]/frontend/src/components/MapView.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MapView
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
// ============================================
// components/MapView.js - Google Maps Component
// ============================================
// Uses Google Maps JavaScript API
// Dynamic import (ssr: false) se use karo
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
;
;
const GOOGLE_MAPS_KEY = ("TURBOPACK compile-time value", "AIzaSyDlXevRiuCOGAglqNNL8H_dLcW1Rc6Qm4g") || '';
function loadGoogleMaps() {
    return new Promise((resolve, reject)=>{
        if (window.google?.maps) {
            resolve(window.google.maps);
            return;
        }
        // Check if script is already loading
        if (document.querySelector('script[src*="maps.googleapis.com"]')) {
            const check = setInterval(()=>{
                if (window.google?.maps) {
                    clearInterval(check);
                    resolve(window.google.maps);
                }
            }, 100);
            setTimeout(()=>{
                clearInterval(check);
                reject(new Error('Google Maps timeout'));
            }, 10000);
            return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=geometry`;
        script.async = true;
        script.defer = true;
        script.onload = ()=>{
            if (window.google?.maps) resolve(window.google.maps);
            else reject(new Error('Google Maps not available'));
        };
        script.onerror = ()=>reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(script);
    });
}
function MapView({ locations = [], selectedScan, onSelectScan, qrInfo }) {
    const mapRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    const googleMapRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    const markersRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])([]);
    const polylineRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    const infoWindowRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    const [mapError, setMapError] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
    }, []);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!googleMapRef.current || locations.length === 0) return;
        loadGoogleMaps().then((maps)=>{
            addMarkers(maps, googleMapRef.current, locations);
        });
    }, [
        locations
    ]);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!googleMapRef.current || !selectedScan) return;
        if (selectedScan.latitude && selectedScan.longitude) {
            googleMapRef.current.panTo({
                lat: selectedScan.latitude,
                lng: selectedScan.longitude
            });
            googleMapRef.current.setZoom(14);
        }
    }, [
        selectedScan
    ]);
    const clearMarkers = ()=>{
        markersRef.current.forEach((m)=>m.setMap(null));
        markersRef.current = [];
        if (polylineRef.current) {
            polylineRef.current.setMap(null);
            polylineRef.current = null;
        }
    };
    const addMarkers = (maps, map, locs)=>{
        clearMarkers();
        const validLocs = locs.filter((l)=>l.latitude && l.longitude && l.latitude !== 0);
        if (validLocs.length === 0) return;
        const bounds = new maps.LatLngBounds();
        const path = [];
        validLocs.forEach((loc, i)=>{
            const isLatest = i === 0;
            const position = {
                lat: loc.latitude,
                lng: loc.longitude
            };
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
                    rotation: 0
                },
                zIndex: isLatest ? 100 : 50 - i,
                title: `${isLatest ? 'Latest Scan' : `Scan #${i + 1}`} - ${loc.address?.city || 'Unknown'}`
            });
            marker.addListener('click', ()=>{
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
                icons: [
                    {
                        icon: {
                            path: 'M 0,-1 0,1',
                            strokeOpacity: 0.5,
                            scale: 3
                        },
                        offset: '0',
                        repeat: '15px'
                    }
                ],
                map
            });
        }
        // Fit bounds
        if (validLocs.length === 1) {
            map.setCenter(path[0]);
            map.setZoom(13);
        } else {
            map.fitBounds(bounds, {
                top: 40,
                right: 40,
                bottom: 40,
                left: 40
            });
        }
    };
    // Error fallback
    if (mapError) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            className: "relative w-full h-full flex items-center justify-center bg-[#1a1a2e]",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "text-center p-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                        className: "text-4xl block mb-3",
                        children: "🗺️"
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/components/MapView.js",
                        lineNumber: 206,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                        className: "text-sm text-gray-400 mb-2",
                        children: "Google Maps API key not configured"
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/components/MapView.js",
                        lineNumber: 207,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-gray-600",
                        children: "Add NEXT_PUBLIC_GOOGLE_MAPS_KEY to your .env.local"
                    }, void 0, false, {
                        fileName: "[project]/frontend/src/components/MapView.js",
                        lineNumber: 208,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/frontend/src/components/MapView.js",
                lineNumber: 205,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/frontend/src/components/MapView.js",
            lineNumber: 204,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "relative w-full h-full",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                ref: mapRef,
                style: {
                    width: '100%',
                    height: '100%'
                }
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapView.js",
                lineNumber: 216,
                columnNumber: 7
            }, this),
            locations.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "absolute top-3 right-3 z-10 bg-[rgba(15,15,45,0.9)] border border-indigo-500/30 rounded-xl px-3 py-2 text-[10px] text-gray-300 font-bold shadow-xl",
                children: [
                    "📍 ",
                    locations.filter((l)=>l.latitude).length,
                    " locations"
                ]
            }, void 0, true, {
                fileName: "[project]/frontend/src/components/MapView.js",
                lineNumber: 219,
                columnNumber: 9
            }, this),
            locations.filter((l)=>l.latitude).length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "absolute inset-0 flex items-center justify-center z-10 pointer-events-none",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "bg-[rgba(15,15,45,0.9)] border border-indigo-500/20 rounded-2xl p-6 text-center",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                            className: "text-3xl block mb-2",
                            children: "🗺️"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapView.js",
                            lineNumber: 227,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            className: "text-sm text-gray-400",
                            children: "No GPS locations found yet"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapView.js",
                            lineNumber: 228,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            className: "text-[10px] text-gray-600 mt-1",
                            children: "When QR is scanned with GPS, it will show on the map"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapView.js",
                            lineNumber: 229,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/frontend/src/components/MapView.js",
                    lineNumber: 226,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapView.js",
                lineNumber: 225,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/src/components/MapView.js",
        lineNumber: 215,
        columnNumber: 5
    }, this);
}
}),
"[project]/frontend/src/components/MapView.js [ssr] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/frontend/src/components/MapView.js [ssr] (ecmascript)"));
}),
];

//# sourceMappingURL=frontend_src_components_MapView_8926e34f.js.map