import { readFileSync } from 'node:fs'

import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// Version shown in the UI. semantic-release bumps package.json and commits it
// back to the repo, so this value stays in sync with the GitHub release tag.
const resolveAppVersion = () => {
  const { version } = JSON.parse(
    readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'),
  ) as { version: string }

  return `v${version}`
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
