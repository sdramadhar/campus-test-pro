# CDN and Static Assets

CDN caching is safe for Next.js versioned static files, public college branding, and downloadable templates. Do not cache authenticated HTML, student answers, private reports, signed evidence URLs, API responses with user data, or hidden coding tests.

Recommended headers:

- versioned static assets: `Cache-Control: public, max-age=31536000, immutable`
- authenticated HTML/API: `Cache-Control: no-store`
- private downloads: short-lived signed URLs with explicit expiry
- all downloads: strict content type and `X-Content-Type-Options: nosniff`

Invalidate CDN paths only for public assets. Private files should use new random keys instead of relying on invalidation.
