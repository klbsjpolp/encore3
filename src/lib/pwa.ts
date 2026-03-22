export function shouldRegisterServiceWorker(
  isProduction: boolean,
  hasServiceWorkerApi: boolean,
): boolean {
  return isProduction && hasServiceWorkerApi
}
