import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dns from 'node:dns'

dns.setDefaultResultOrder('verbatim')


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3030,
    proxy: {
      // Pokud vaše API volání v StagApiService začínají např. '/ws/services/rest2'
      // a plná URL je 'https://stag-ws.zcu.cz/ws/services/rest2/...'
      // Chceme, aby se požadavky na '/api-stag' přeposílaly na STAG server
      '/api-stag': {
        target: 'https://stag-ws.zcu.cz', // Cílový STAG server
        changeOrigin: true, // Nutné pro virtuální hostování a přepsání 'Host' hlavičky
        rewrite: (path) => path.replace(/^\/api-stag/, ''), // Odstraní /api-stag z cesty požadavku
        secure: false, // Pokud STAG server používá self-signed certifikát (pro produkci spíše true)
      }
    }
  },
})
