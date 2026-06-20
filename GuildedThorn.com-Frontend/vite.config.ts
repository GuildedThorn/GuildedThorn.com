import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prefer locally-trusted mkcert certs (no browser warning). Generate once with:
//   mkcert -install
//   mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost 127.0.0.1 ::1
// If they're absent, fall back to the self-signed basic-ssl plugin.
const certKey = path.resolve(__dirname, 'certs/localhost-key.pem');
const certCrt = path.resolve(__dirname, 'certs/localhost.pem');
const hasMkcert = fs.existsSync(certKey) && fs.existsSync(certCrt);

const frontendRoutePatterns = [
  /^\/$/,
  /^\/(?:login|register|contact|net|stream|privacy|cookies|resume|projects|uses|settings|inbox|guestbook|radio)\/?$/,
  /^\/tools(?:\/[^/]+)?\/?$/,
  /^\/blog\/(?:pages(?:\/[^/]+)?|upload)\/?$/,
  /^\/gallery\/(?:images(?:\/[^/]+)?|upload)\/?$/,
];

function isFrontendRoute(pathname: string) {
  return frontendRoutePatterns.some((pattern) => pattern.test(pathname));
}

function isProxyRoute(pathname: string) {
  return ['/api', '/chathub', '/radiohub', '/images', '/health'].some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // HTTPS on the dev server so it matches the .NET SpaProxyServerUrl
    // (https://localhost:5173); without TLS an https:// request fails with
    // SSL_ERROR_RX_RECORD_TOO_LONG. Only needed when there's no mkcert cert.
    ...(hasMkcert ? [] : [basicSsl()]),
    {
      name: 'spa-404-status',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.method !== 'GET' && req.method !== 'HEAD') return next();

          const pathname = new URL(req.url ?? '/', 'https://localhost').pathname;
          const isViteInternal =
            pathname.startsWith('/@') ||
            pathname.startsWith('/__vite') ||
            pathname === '/favicon.ico' ||
            path.extname(pathname) !== '';

          if (!isViteInternal && !isProxyRoute(pathname) && !isFrontendRoute(pathname)) {
            try {
              const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
              const html = await server.transformIndexHtml(req.url ?? '/', template);

              res.statusCode = 404;
              res.setHeader('Content-Type', 'text/html');
              res.end(req.method === 'HEAD' ? undefined : html);
            } catch (error) {
              next(error);
            }
            return;
          }

          next();
        });
      },
    },
    // Only emit/open the bundle report when explicitly requested: ANALYZE=1 bun run build
    ...(process.env.ANALYZE ? [visualizer({ open: true, gzipSize: true, filename: 'stats.html' })] : []),
  ],
  server: {
    port: 5173,
    // Trusted mkcert cert when available; basic-ssl handles TLS otherwise.
    ...(hasMkcert
      ? { https: { key: fs.readFileSync(certKey), cert: fs.readFileSync(certCrt) } }
      : {}),
    // Dev: proxy API / SignalR / uploaded images to the .NET backend so the
    // SPA at https://localhost:5173 is fully functional (auth cookies, uploads).
    proxy: {
      '/api': { target: 'https://localhost:7101', changeOrigin: true, secure: false },
      '/chathub': { target: 'https://localhost:7101', changeOrigin: true, secure: false, ws: true },
      '/radiohub': { target: 'https://localhost:7101', changeOrigin: true, secure: false, ws: true },
      '/images': { target: 'https://localhost:7101', changeOrigin: true, secure: false },
      '/health': { target: 'https://localhost:7101', changeOrigin: true, secure: false },
    },
  },
  build: {
    outDir: path.resolve(__dirname, '../wwwroot'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Split only the libraries shared across many/all routes into stable,
        // cacheable chunks. Route-specific heavy deps (ReactFlow, SignalR,
        // markdown/highlight) are left to the code-splitting in AppRoutes, so
        // they live in their lazy route's async chunk — never on initial load.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // React core, react-dom AND react-router must share one chunk: if
          // react-router is split out, its top-level createContext() runs before
          // the React chunk initializes ("createContext of undefined") and the
          // app never mounts. Keep them together so init order is guaranteed.
          if (
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/@remix-run') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/scheduler') ||
            /node_modules\/react\//.test(id)
          )
            return 'vendor';
          if (id.includes('node_modules/react-icons')) return 'react-icon';
        },
      }
    }
  },
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, './src/components'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@backend': path.resolve(__dirname, './src/backend'),
      '@layouts': path.resolve(__dirname, './src/layouts'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@lib': path.resolve(__dirname, './src/lib'),
    },
  },
});
