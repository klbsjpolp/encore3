// Build-time helper: pick the version string shown in the UI.
// Prefer an explicit override (the version semantic-release computed for a
// release build, passed through as VITE_APP_VERSION — see deploy.yml) and fall
// back to the version in package.json. The result always carries a leading `v`.
export const resolveBuildVersion = (
  envVersion: string | undefined,
  packageVersion: string,
): string => {
  const override = envVersion?.trim()
  const version = override ? override : packageVersion

  return version.startsWith('v') ? version : `v${version}`
}
