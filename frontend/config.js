/* ============================================================
   HomoDentHealth — Frontend Configuration
   ============================================================
   Edit the two values below before deploying. This file is
   loaded before every other script on every page.
   ============================================================ */
window.APP_CONFIG = {
  // The URL where your backend API is running.
  //   Local development:        http://localhost:4000
  //   Same-host deployment:     http://YOUR-SERVER-IP:4000  (or your domain)
  //   Separate hosting (e.g. backend on Render/Railway):
  //                              https://your-backend.onrender.com
  API_BASE_URL: 'http://localhost:4000',

  // Paste your Google Maps JavaScript API key here to enable the
  // interactive map on the Clinics page. Without it, the clinic
  // list still works fully — you just won't see the embedded map.
  // Get a free key at: https://console.cloud.google.com/google/maps-apis
  GOOGLE_MAPS_API_KEY: ''
};
