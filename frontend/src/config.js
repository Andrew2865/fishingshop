const browser = typeof window !== 'undefined' ? window.location : null;
const hostname = browser?.hostname || '';
const protocol = browser?.protocol || 'http:';
const port = browser?.port || '';

const isLocalPreview = port === '3000';
const localBackendOrigin = isLocalPreview ? `${protocol}//${hostname}:5000` : '';

const envApi = (process.env.REACT_APP_API_URL || '').trim();
const envBackend = (process.env.REACT_APP_BACKEND_URL || '').trim();

export const API_BASE_URL = envApi
  ? (envApi === '/api' && isLocalPreview ? `${localBackendOrigin}/api` : envApi)
  : (isLocalPreview ? `${localBackendOrigin}/api` : '/api');

export const BACKEND_BASE_URL = envBackend
  ? envBackend
  : (isLocalPreview ? localBackendOrigin : '');

export function buildImageUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${BACKEND_BASE_URL}${url}`;
}
