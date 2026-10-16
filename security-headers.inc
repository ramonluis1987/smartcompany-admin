# nginx drops server-level add_header in locations that set their own, so each location includes these
add_header X-Frame-Options DENY always;
add_header X-Content-Type-Options nosniff always;
add_header Referrer-Policy strict-origin-when-cross-origin always;
add_header X-Robots-Tag "noindex, nofollow" always;
