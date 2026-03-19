module.exports = [
"[project]/frontend/src/components/MapView.js [ssr] (ecmascript, next/dynamic entry, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/[externals]_leaflet_f4b9eb92._.js",
  "server/chunks/ssr/[root-of-the-server]__1a1fe264._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[project]/frontend/src/components/MapView.js [ssr] (ecmascript, next/dynamic entry)");
    });
});
}),
"[externals]/socket.io-client [external] (socket.io-client, esm_import, [project]/frontend/node_modules/socket.io-client, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.resolve().then(() => {
        return parentImport("[externals]/socket.io-client [external] (socket.io-client, esm_import, [project]/frontend/node_modules/socket.io-client)");
    });
});
}),
];