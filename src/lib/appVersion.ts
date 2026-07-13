// Version string injected at build time by Vite (see `define` in vite.config.ts).
// Falls back to 'dev' when the constant is not defined (e.g. outside a build).
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'
