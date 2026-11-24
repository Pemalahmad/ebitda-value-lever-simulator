import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Content-Security-Policy for the built site. GitHub Pages cannot send headers, so it goes in a meta tag,
// added only to production builds (the dev server needs inline scripts for hot reload).
// Scripts load only from this site; fonts only from Google Fonts; no plugins, frames or form posts.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-src 'none'",
].join('; ');

const securityMeta = {
  name: 'security-meta',
  apply: 'build',
  transformIndexHtml: (html) => html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`),
};

// Relative base so the build works on GitHub Pages and behind the Node server.
export default defineConfig({
  base: './',
  plugins: [react(), securityMeta],
  build: { outDir: 'dist', sourcemap: false },
});
