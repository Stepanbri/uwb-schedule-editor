import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dns from 'node:dns';

dns.setDefaultResultOrder('verbatim');

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    //base: '/',
    server: {
        host: true,
        port: 3030,
        proxy: {
            // proxy pro přístup k STAG-WS - bez proxy by se nepodařilo přistupovat k STAG-WS na localhostu.
            '/api/stag-production/': {
                target: 'https://stag-ws.zcu.cz/', // Produkční STAG ZČU
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api\/stag-production/, ''),
                secure: true, // Má STAG-WS platný certifikát
            },
            '/api/stag-demo/': {
                target: 'https://stag-demo.zcu.cz/', // Demo STAG ZČU
                changeOrigin: true,
                rewrite: path => path.replace(/^\/api\/stag-demo/, ''),
                secure: false,
            },
        },
    },
});
