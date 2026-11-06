# Farm-off
Responsive farm platform on Netlify, deployed automatically from main.

## Features
Demo and signed-in modes are deliberately separate. Interactive 50-plot map, multiple plots, signs, task queue, planting planner, journal, harvest records, pickup plans, listings, export, crop guides. Animals are a future module.

## Server
Netlify Functions + Netlify Database/Postgres. Migrations create 50 **unavailable** plots. A farmer must verify and open each plot. Reservations use a conditional SQL update to prevent double allocation. Passwords use salted scrypt, opaque sessions use HttpOnly Secure SameSite cookies and hashed tokens. Server enforces ownership and staff roles; login/register have IP limits.

Deploy provisions Netlify Database using current plan credits. No new paid plan is selected.

## First farmer
Create a normal account in the site's registration form. An authorized administrator must assign that exact account the `farmer` role in the database. Never make the first registrant admin automatically. Do not put database credentials or camera passwords into frontend code.

## Limits before public commercial launch
Password recovery, email/phone verification, payments, rental agreements, courier fulfillment and private camera gateway remain integrations. Listings are offers, not paid orders. Camera HTTPS playback depends on the browser-supported stream format; RTSP requires a gateway. No public exposure change has been made: site retains existing Netlify protection.

## Development and tests
`npm ci`, `npm test`, `npm run check`.
Static preview: `python3 -m http.server 8766 --directory dist` (demo only; API requires Netlify).
Tests cover password validation, authorization helpers, camera URL validation, schema, competing reservations and stale writes using a local Postgres-compatible engine.

## Application path
`data.js` is demo persistence, `features.js` uses `/api/*` for accounts. Future native clients should use a separately scoped mobile authentication flow; do not copy browser cookies into a native app. Manifest supplies initial web-app metadata. Offline mutations are not enabled.
