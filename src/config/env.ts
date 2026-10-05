const apiBase = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const resolved = new URL(apiBase, window.location.origin);
const local = ['localhost', '127.0.0.1', '[::1]'].includes(resolved.hostname);
if (resolved.username || resolved.password || resolved.search || resolved.hash) {
  throw new Error('Invalid API base URL configuration.');
}
if (
  resolved.protocol !== 'https:' &&
  !(import.meta.env.DEV && local && resolved.protocol === 'http:')
) {
  // Relative same-origin URLs support local development; production hosting must use HTTPS.
  if (!(apiBase.startsWith('/') && !apiBase.startsWith('//'))) {
    throw new Error('The API base URL must use HTTPS.');
  }
}
export const env = Object.freeze({
  apiBaseUrl: resolved.href.replace(/\/$/, ''),
});
