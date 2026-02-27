import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  optimizeDeps: {
    include: ['react-globe.gl', 'satellite.js'],
  },
  server: {
    proxy: {
      // adsb.lol regional endpoints — 3 areas cover the whole globe
      // dist unit is nautical miles; 10000 nm ≈ 18500 km > Earth radius → hemisphere coverage
      '/proxy/adsb-eur': {
        target: 'https://api.adsb.lol',
        changeOrigin: true,
        rewrite: () => '/v2/lat/50/lon/10/dist/10000',
        configure: (proxy) => {
          proxy.on('proxyRes', (res) => console.log('[proxy/adsb-eur]', res.statusCode))
          proxy.on('error',    (err) => console.error('[proxy/adsb-eur]', err.message))
        },
      },
      '/proxy/adsb-nam': {
        target: 'https://api.adsb.lol',
        changeOrigin: true,
        rewrite: () => '/v2/lat/40/lon/-95/dist/10000',
        configure: (proxy) => {
          proxy.on('proxyRes', (res) => console.log('[proxy/adsb-nam]', res.statusCode))
          proxy.on('error',    (err) => console.error('[proxy/adsb-nam]', err.message))
        },
      },
      '/proxy/adsb-asi': {
        target: 'https://api.adsb.lol',
        changeOrigin: true,
        rewrite: () => '/v2/lat/25/lon/110/dist/10000',
        configure: (proxy) => {
          proxy.on('proxyRes', (res) => console.log('[proxy/adsb-asi]', res.statusCode))
          proxy.on('error',    (err) => console.error('[proxy/adsb-asi]', err.message))
        },
      },
      // OpenSky fallback
      '/proxy/opensky': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        rewrite: () => '/api/states/all',
        configure: (proxy) => {
          proxy.on('proxyRes', (res) => console.log('[proxy/opensky]', res.statusCode))
          proxy.on('error',    (err) => console.error('[proxy/opensky]', err.message))
        },
      },
      // CCTV: avoid CORS so all camera list APIs work from the app
      '/proxy/cctv-nyc': {
        target: 'https://webcams.nyctmc.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/cctv-nyc/, '/api/cameras'),
        configure: (proxy) => {
          proxy.on('proxyRes', (res) => console.log('[proxy/cctv-nyc]', res.statusCode))
        },
      },
      '/proxy/cctv-ontario': {
        target: 'https://on.ibi511.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/cctv-ontario/, '/api/v2/get/cameras'),
        configure: (proxy) => {
          proxy.on('proxyRes', (res) => console.log('[proxy/cctv-ontario]', res.statusCode))
        },
      },
      '/proxy/cctv-wsdot': {
        target: 'https://data.wsdot.wa.gov',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/cctv-wsdot/, '/mobile/Cameras.json'),
        configure: (proxy) => {
          proxy.on('proxyRes', (res) => console.log('[proxy/cctv-wsdot]', res.statusCode))
        },
      },
      '/proxy/otc': {
        target: 'https://raw.githubusercontent.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/otc\/?/, '/AidanWelch/OpenTrafficCamMap/master/cameras/'),
        configure: (proxy) => {
          proxy.on('proxyRes', (res) => console.log('[proxy/otc]', res.statusCode))
        },
      },
    },
  },
})
