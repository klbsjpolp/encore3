import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  });
});
