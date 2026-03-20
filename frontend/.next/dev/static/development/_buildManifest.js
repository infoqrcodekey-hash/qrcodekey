self.__BUILD_MANIFEST = {
  "/audit-log": [
    "static/chunks/pages/audit-log.js"
  ],
  "/emergency-broadcast": [
    "static/chunks/pages/emergency-broadcast.js"
  ],
  "/holiday-calendar": [
    "static/chunks/pages/holiday-calendar.js"
  ],
  "/leave-management": [
    "static/chunks/pages/leave-management.js"
  ],
  "/notifications": [
    "static/chunks/pages/notifications.js"
  ],
  "/reports": [
    "static/chunks/pages/reports.js"
  ],
  "/shift-management": [
    "static/chunks/pages/shift-management.js"
  ],
  "/visitor-management": [
    "static/chunks/pages/visitor-management.js"
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
    "/attendance-dashboard",
    "/attendance-scanner",
    "/audit-log",
    "/bulk-generate",
    "/bulk-qr-attendance",
    "/custom-qr",
    "/dashboard",
    "/emergency-broadcast",
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