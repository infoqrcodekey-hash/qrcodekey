module.exports = [
"[externals]/styled-jsx/style.js [external] (styled-jsx/style.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("styled-jsx/style.js", () => require("styled-jsx/style.js"));

module.exports = mod;
}),
"[project]/frontend/src/components/MapView.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>MapView
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$styled$2d$jsx$2f$style$2e$js__$5b$external$5d$__$28$styled$2d$jsx$2f$style$2e$js$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/styled-jsx/style.js [external] (styled-jsx/style.js, cjs)");
// ============================================
// components/MapView.js - Leaflet Map Component
// ============================================
// Free OpenStreetMap tiles - No API key needed!
// Dynamic import se use karo (ssr: false)
// Loads Leaflet from CDN if npm package not available
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
;
;
;
// Helper: Load Leaflet (npm first, fallback to CDN)
function loadLeaflet() {
    return __turbopack_context__.A("[externals]/leaflet [external] (leaflet, cjs, [project]/frontend/node_modules/leaflet, async loader)").catch(()=>{
        // npm package not found → load from CDN
        return new Promise((resolve, reject)=>{
            if (window.L) {
                resolve(window.L);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = ()=>resolve(window.L);
            script.onerror = ()=>reject(new Error('Failed to load Leaflet'));
            document.head.appendChild(script);
        });
    });
}
function MapView({ locations = [], selectedScan, onSelectScan, qrInfo }) {
    const mapRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    const leafletMapRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    const markersRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])([]);
    const polylineRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if ("TURBOPACK compile-time truthy", 1) return;
        //TURBOPACK unreachable
        ;
    }, []);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!leafletMapRef.current || locations.length === 0) return;
        loadLeaflet().then((L)=>{
            addMarkers(L, leafletMapRef.current, locations);
        });
    }, [
        locations
    ]);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!leafletMapRef.current || !selectedScan) return;
        if (selectedScan.latitude && selectedScan.longitude) {
            leafletMapRef.current.flyTo([
                selectedScan.latitude,
                selectedScan.longitude
            ], 14, {
                duration: 1.2
            });
        }
    }, [
        selectedScan
    ]);
    const addMarkers = (L, map, locs)=>{
        markersRef.current.forEach((m)=>m.remove());
        markersRef.current = [];
        if (polylineRef.current) {
            polylineRef.current.remove();
            polylineRef.current = null;
        }
        const validLocs = locs.filter((l)=>l.latitude && l.longitude && l.latitude !== 0);
        if (validLocs.length === 0) return;
        const points = [];
        validLocs.forEach((loc, i)=>{
            const isLatest = i === 0;
            const lat = loc.latitude;
            const lng = loc.longitude;
            points.push([
                lat,
                lng
            ]);
            const iconHtml = isLatest ? `<div style="background:linear-gradient(135deg,#6366f1,#a855f7);width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(99,102,241,0.6)"></div>` : `<div style="background:rgba(99,102,241,0.6);width:14px;height:14px;border-radius:50%;border:2px solid rgba(99,102,241,0.9)"></div>`;
            const icon = L.divIcon({
                html: iconHtml,
                className: '',
                iconSize: isLatest ? [
                    28,
                    28
                ] : [
                    14,
                    14
                ],
                iconAnchor: isLatest ? [
                    14,
                    28
                ] : [
                    7,
                    7
                ]
            });
            const marker = L.marker([
                lat,
                lng
            ], {
                icon
            }).addTo(map).bindPopup(`
          <div style="font-family:sans-serif;min-width:160px">
            <b style="color:#6366f1">${isLatest ? '🔴 Latest Scan' : `#${i + 1}`}</b><br/>
            <small>📍 ${loc.address?.city || 'Unknown'}, ${loc.address?.country || ''}</small><br/>
            <small>📱 ${loc.device?.deviceType || 'Device'} | ${loc.device?.os || ''}</small><br/>
            <small>⏰ ${new Date(loc.scannedAt).toLocaleString('en-IN')}</small>
            ${loc.isApproximate ? '<br/><small style="color:orange">⚠️ Approximate location</small>' : ''}
          </div>
        `, {
                maxWidth: 220
            });
            marker.on('click', ()=>{
                if (onSelectScan) onSelectScan(loc);
            });
            markersRef.current.push(marker);
        });
        if (points.length > 1) {
            polylineRef.current = L.polyline(points, {
                color: '#6366f1',
                weight: 2,
                opacity: 0.5,
                dashArray: '6, 6'
            }).addTo(map);
        }
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, {
            padding: [
                40,
                40
            ],
            maxZoom: 13
        });
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "jsx-51f94cc72a3a17c2" + " " + "relative w-full h-full",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("link", {
                rel: "stylesheet",
                href: "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
                className: "jsx-51f94cc72a3a17c2"
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapView.js",
                lineNumber: 139,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$styled$2d$jsx$2f$style$2e$js__$5b$external$5d$__$28$styled$2d$jsx$2f$style$2e$js$2c$__cjs$29$__["default"], {
                id: "51f94cc72a3a17c2",
                children: ".leaflet-container{background:#1a1a2e}.leaflet-popup-content-wrapper{color:#e0e0f0;background:#0f0f2df2;border:1px solid #6366f14d;border-radius:12px}.leaflet-popup-tip{background:#0f0f2df2}.leaflet-control-zoom a{color:#e0e0f0!important;background:#0f0f2df2!important;border-color:#6366f14d!important}"
            }, void 0, false, void 0, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                ref: mapRef,
                style: {
                    width: '100%',
                    height: '100%'
                },
                className: "jsx-51f94cc72a3a17c2"
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapView.js",
                lineNumber: 147,
                columnNumber: 7
            }, this),
            locations.length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "jsx-51f94cc72a3a17c2" + " " + "absolute top-3 right-3 z-[1000] bg-[rgba(15,15,45,0.9)] border border-indigo-500/30 rounded-xl px-3 py-2 text-[10px] text-gray-300 font-bold shadow-xl",
                children: [
                    "📍 ",
                    locations.filter((l)=>l.latitude).length,
                    " locations"
                ]
            }, void 0, true, {
                fileName: "[project]/frontend/src/components/MapView.js",
                lineNumber: 150,
                columnNumber: 9
            }, this),
            locations.filter((l)=>l.latitude).length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "jsx-51f94cc72a3a17c2" + " " + "absolute inset-0 flex items-center justify-center z-[1000] pointer-events-none",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "jsx-51f94cc72a3a17c2" + " " + "bg-[rgba(15,15,45,0.9)] border border-indigo-500/20 rounded-2xl p-6 text-center",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                            className: "jsx-51f94cc72a3a17c2" + " " + "text-3xl block mb-2",
                            children: "🗺️"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapView.js",
                            lineNumber: 158,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            className: "jsx-51f94cc72a3a17c2" + " " + "text-sm text-gray-400",
                            children: "No GPS locations found yet"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapView.js",
                            lineNumber: 159,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                            className: "jsx-51f94cc72a3a17c2" + " " + "text-[10px] text-gray-600 mt-1",
                            children: "When QR is scanned with GPS, it will show on the map"
                        }, void 0, false, {
                            fileName: "[project]/frontend/src/components/MapView.js",
                            lineNumber: 160,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/frontend/src/components/MapView.js",
                    lineNumber: 157,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/frontend/src/components/MapView.js",
                lineNumber: 156,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/frontend/src/components/MapView.js",
        lineNumber: 138,
        columnNumber: 5
    }, this);
}
}),
"[project]/frontend/src/components/MapView.js [ssr] (ecmascript, next/dynamic entry)", ((__turbopack_context__) => {

__turbopack_context__.n(__turbopack_context__.i("[project]/frontend/src/components/MapView.js [ssr] (ecmascript)"));
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1a1fe264._.js.map