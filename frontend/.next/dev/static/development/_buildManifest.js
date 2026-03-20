self.__BUILD_MANIFEST = {
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
    "/attendance-dashboard",
    "/attendance-scanner",
    "/audit-log",
    "/bulk-generate",
    "/bulk-qr-attendance",
    "/custom-qr",
    "/dashboard",
    "/emergency-broadcast",
    "/face-verification",
    "/forgot-password",
    "/generate",
    "/group/[id]",
    "/holiday-calendar",
    "/leave-management",
    "/login",
    "/map/[qrId]",
    "/notifications",
    "/org-location",
    "/organization/[id]",
    "/organizations",
    "/pricing",
    "/privacy-policy",
    "/profile",
    "/qr/[qrId]",
    "/refund-policy",
    "/register",
    "/reports",
    "/scan/[qrId]",
    "/scanner",
    "/shared-dashboard",
    "/shift-management",
    "/teams",
    "/terms",
    "/track",
    "/viewer-login",
    "/visitor-management"
  ]
};self.__BUILD_MANIFEST_CB && self.__BUILD_MANIFEST_CB()