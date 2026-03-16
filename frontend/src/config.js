export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
export const BACKEND_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export function buildImageUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${BACKEND_BASE_URL}${url}`;
}
