# GlobeView!

A real-time, open-source geospatial intelligence dashboard rendered on an interactive 3D globe. Track live flights, satellites, earthquakes, weather radar, traffic cameras, and breaking news — all in one tactical UI.

---

## Features

| Layer | Source | Update interval |
|---|---|---|
| **Live Flights** | OpenSky Network (global ADS-B) | 30 s |
| **Satellites** | CelesTrak TLE + SGP4 propagation | 1 s |
| **Earthquakes** | USGS all_day feed | 5 min |
| **Weather Radar** | RainViewer tiles | ~10 min |
| **CCTV Cameras** | TfL JamCam (~600 London cameras) | 30 s |
| **News Headlines** | GNews API (by region) | on demand |

**Visual modes** — Normal, CRT, Night Vision (NVG), FLIR, Anime, Noir, Snow, AI

**Post-processing controls** — bloom, sharpening, pixelation, distortion, signal instability

**Close-up zoom** — switches to a street/satellite map overlay (Leaflet or Mapbox 3D bird's-eye)

**360° Street View** — click any camera marker to open a Google Street View panorama (requires API key)

**Flight lookup** — search by callsign or ICAO hex to pan the globe to any tracked aircraft

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm 9 or later (comes with Node)

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/your-username/worldview.git
cd worldview

# 2. Install dependencies
npm install

# 3. Configure environment variables (see section below)
cp .env.example .env
# Edit .env with your keys

# 4. Start the dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Environment variables

Copy `.env.example` to `.env` and fill in the keys you want to use. **All keys are optional** — layers that need a missing key will show a warning instead of crashing.

```bash
cp .env.example .env
```

| Variable | Required for | Where to get it |
|---|---|---|
| `VITE_GNEWS_API_KEY` | News layer (headlines by region) | [gnews.io](https://gnews.io/) — free tier available |
| `VITE_GOOGLE_MAPS_API_KEY` | 360° Street View on camera markers | [Google Cloud Console](https://console.cloud.google.com/) — enable *Maps JavaScript API* |
| `VITE_MAPBOX_ACCESS_TOKEN` | Bird's-eye 3D map overlay when zoomed in | [account.mapbox.com](https://account.mapbox.com/) — free tier available |
| `VITE_NEWS_LIVE_YOUTUBE_ID` | Live news broadcast embed (optional) | YouTube video ID of any live stream (e.g. Al Jazeera, DW News) |

> **Without any keys:** flights, satellites, earthquakes, weather radar, and TfL CCTV cameras all work out of the box — no API key required.

---

## Build for production

```bash
npm run build
```

Output goes to `dist/`. Serve it with any static host (Nginx, Vercel, Netlify, GitHub Pages, etc.):

```bash
# Preview the production build locally
npm run preview
```

---

## Tech stack

- **[React 19](https://react.dev/)** + **[Vite 7](https://vitejs.dev/)**
- **[react-globe.gl](https://github.com/vasturiano/react-globe.gl)** (Three.js / WebGL)
- **[Tailwind CSS v4](https://tailwindcss.com/)** via `@tailwindcss/vite`
- **[satellite.js](https://github.com/shashwatak/satellite-js)** — SGP4/SDP4 orbital propagation
- **[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/)** — 3D bird's-eye overlay
- **[react-leaflet](https://react-leaflet.js.org/)** — fallback 2D map

---

## Data sources

All primary data sources are free and require no API key:

- **Flights**: [OpenSky Network](https://opensky-network.org/) REST API
- **Satellites**: [CelesTrak](https://celestrak.org/) GP JSON (TLE data)
- **Earthquakes**: [USGS Earthquake Hazards](https://earthquake.usgs.gov/earthquakes/feed/)
- **Weather**: [RainViewer](https://www.rainviewer.com/api.html) public radar tiles
- **CCTV**: [TfL JamCam API](https://api.tfl.gov.uk/Place/Type/JamCam) (no key needed)

---

## Project structure

```
src/
├── App.jsx                       # Root — state, layer toggles, view mode
├── components/
│   ├── Globe.jsx                 # Full-screen 3D globe (react-globe.gl)
│   ├── LeftPanel.jsx             # Data layer toggles
│   ├── RightPanel.jsx            # Visual controls & sliders
│   ├── HUD.jsx                   # Coords, timestamp, REC indicator overlay
│   ├── BottomBar.jsx             # City quick-jump + UTC clock
│   ├── FlightCard.jsx            # Flight detail modal
│   ├── CCTVPanel.jsx             # CCTV feed panel
│   ├── StreetViewModal.jsx       # Google Street View panorama
│   └── MapboxBirdEyeOverlay.jsx  # 3D bird's-eye zoom overlay
└── hooks/
    ├── useFlights.js             # OpenSky polling
    ├── useSatellites.js          # CelesTrak TLE + SGP4 propagation
    ├── useEarthquakes.js         # USGS feed
    ├── useWeather.js             # RainViewer radar tiles
    ├── useCCTV.js                # TfL JamCam feed
    └── useNews.js                # GNews API
```

---

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you'd like to change.

---

## License

[MIT](LICENSE)
