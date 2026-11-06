# Farm-off
Responsive prototype for desktop and mobile. Netlify publish directory: `dist`. No build command.

## Current status
Demo only: data lives in this browser. No authentication, shared database, payments, actual rentals or live cameras. All camera screens explicitly show placeholders. 50 plots are sample inventory, not real availability.

## Run
`python3 -m http.server 8765 --directory dist`

## Architecture
`data.js` isolates persistence; replace the adapter with authenticated server API before admitting real users. `app.js` renders the UI. A web app manifest provides a starting point for an installable app; native packaging and store publication are not implemented.

## Production launch gates
- Authenticated users and farmer/admin roles enforced on the server.
- Database entities: farms, users, memberships, plots, rentals, cameras, tasks, listings, orders; future animals and care events.
- Transactional rental allocation prevents double bookings; authorization on each plot/camera/task.
- Camera gateway converts RTSP to HLS/WebRTC; browser receives short-lived access URLs, never camera passwords.
- Server-side task audit trail, backup/restore, multi-user and concurrent rental tests.
- Payment provider integration with verified webhooks before accepting payments.
- Confirm actual farm inventory, prices and camera URLs.
