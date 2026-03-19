module.exports = [
"[externals]/leaflet [external] (leaflet, cjs, [project]/frontend/node_modules/leaflet, async loader)", ((__turbopack_context__) => {

__turbopack_context__.v((parentImport) => {
    return Promise.all([
  "server/chunks/ssr/[externals]_leaflet_5142e73c._.js"
].map((chunk) => __turbopack_context__.l(chunk))).then(() => {
        return parentImport("[externals]/leaflet [external] (leaflet, cjs, [project]/frontend/node_modules/leaflet)");
    });
});
}),
];