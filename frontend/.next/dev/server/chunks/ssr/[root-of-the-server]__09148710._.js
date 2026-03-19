module.exports = [
"[project]/frontend/src/components/MapView.js [ssr] (ecmascript, next/dynamic entry, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/frontend_src_components_MapView_8926e34f.js"
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