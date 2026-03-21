import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  // GitHub Pages serves project sites from /<repo>/.
  // In CI, derive this automatically from GITHUB_REPOSITORY to avoid hardcoding.
  const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const githubPagesBase = repositoryName ? `/${repositoryName}/` : "/";
  const base = isProd ? process.env.VITE_BASE_PATH ?? githubPagesBase : "/";

  return ({
    base,
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "robots.txt", "game-image.svg", "pwa-192x192.png", "pwa-512x512.png"],
        manifest: {
          name: "Encore Roll and Write",
          short_name: "Encore",
          description: "Play Encore roll-and-write in your browser.",
          theme_color: "#0ea5e9",
          background_color: "#ffffff",
          display: "standalone",
          start_url: ".",
          scope: ".",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
});
