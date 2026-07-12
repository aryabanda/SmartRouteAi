# Smart Route AI — Backend

Small Express server that does two jobs for the mobile app:

1. **Proxies Google Directions** (`/api/route`, `/api/route/recalculate`) so your Google Maps API key lives on the server, never inside the shipped APK.
2. **Classifies confirmed route deviations** (`/api/deviation/classify`) as either `intentional_reroute` (silently recalculate) or `suspicious` (proceed toward SOS). Currently rule-based — see the `AI HOOK` comment in `src/services/deviationClassifier.js` for exactly where a trained model slots in later.

## Setup

```bash
cd backend
npm install
cp .env.example .env
# then edit .env and paste your real Google Maps API key
npm run dev
```

Server runs on `http://localhost:4000` by default. Health check: `GET /health`.

## Connecting the mobile app

In `mobile/src/services/route.ts`, set `BACKEND_URL` to your dev machine's **LAN IP**, not `localhost` — a phone (or even the Android emulator in some setups) can't resolve your computer's `localhost` as itself.

```
ipconfig        # Windows, look for IPv4 Address
ifconfig        # Mac/Linux, look for inet
```

Example: `const BACKEND_URL = 'http://192.168.1.5:4000';`

Both your phone and dev machine need to be on the same Wi-Fi network for this to work.

## Endpoints

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/api/route` | `{origin, destination}` | `{coordinates, distance, duration, destinationAddress}` |
| POST | `/api/route/recalculate` | `{origin, destination}` | same shape as above |
| POST | `/api/deviation/classify` | `{distanceFromRoute, speedKph, headingChangeDeg, timeOffRouteMs}` | `{label, confidence, reason}` |

## Where this goes next

- **Persistence**: right now there's no database — every request is stateless. If you want journey history (for your report, and eventually to train the real ML model), add a `journeys` table/collection and a couple of endpoints to log location pings and deviation events.
- **The real ML model**: once you have logged journeys, train a model offline (Python is easiest for scikit-learn), export it, and either (a) run it in a small Python microservice this Express server calls, or (b) port the trained decision boundary into JS. Either way, only `deviationClassifier.js` needs to change — the endpoint contract stays the same.
- **Deploy**: for your demo, running this on your laptop on the same Wi-Fi as your phone is fine. If you want it reachable outside your network, Render/Railway free tiers work well for a small Express app like this.
