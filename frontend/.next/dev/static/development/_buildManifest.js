self.__BUILD_MANIFEST = {
  "/": [
    "static/chunks/pages/index.js"
  ],
  "/forgot-password": [
    "static/chunks/pages/forgot-password.js"
  ],
  "/login": [
    "static/chunks/pages/login.js"
  ],
  "__rewrites": {
    "afterFiles": [
      {
        "source": "/api/:path*"
      }
    ],
    "beforeFiles": [],
    "fallback": []
  },
  "sortedPages": [
    "/",
    "/_app",
    "/_error",
    "/analytics",
    "/attendance/scan/[groupId]",
    "/attendance/[groupId]",
    "/bulk-generate",
    "/custom-qr",
    "/dashboard",
    "/forgot-password",
    "/generate",
    "/group/[id]",
    "/login",
    "/map/[qrId]",
    "/organization/[id]",
    "/organizations",
    "/pricing",
    "/privacy-policy",
    "/profile",
    "/qr/[qrId]",
    "/refund-policy",
    "/register",
    "/scan/[qrId]",
    "/scanner",
    "/shared-dashboard",
    "/teams",
    "/terms",
    "/track"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()