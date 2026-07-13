import { readFileSync } from 'node:fs'

import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import { resolveBuildVersion } from './src/lib/buildVersion'

// Version shown in the UI. On a release build the version computed by
// semantic-release is threaded in via VITE_APP_VERSION (see deploy.yml); outside
// of that (local builds) we fall back to the version in package.json.
const resolveAppVersion = () => {
  const { version } = JSON.parse(
    readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
  ) as { version: string }

  return resolveBuildVersion(process.env.VITE_APP_VERSION, version)
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  // GitHub Pages serves project sites from /<repo>/.
  // In CI, derive this automatically from GITHUB_REPOSITORY to avoid hardcoding.
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
  const githubPagesBase = repositoryName ? `/${repositoryName}/` : '/'
  const base = isProd ? (process.env.VITE_BASE_PATH ?? githubPagesBase) : '/'

  return {
    base,
    define: {
      __APP_VERSION__: JSON.stringify(resolveAppVersion()),
    },
    server: {
      host: '::',
      port: 8080,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.svg',
          'robots.txt',
          'game-image.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
          'apple-touch-icon.png',
        ],
        manifest: {
          name: 'Encore Roll and Write',
          short_name: 'Encore',
          description: 'Play Encore roll-and-write in your browser.',
          theme_color: '#0ea5e9',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '.',
          scope: '.',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
