// The public Render API keeps the deployed frontend functional if Vercel's
// build-time REACT_APP_API_URL variable has not been configured yet.
const BASE = process.env.REACT_APP_API_URL || 'https://week6-lab-3-n2tf.onrender.com';

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({ error: 'server ไม่ได้ตอบเป็น JSON' }));
  if (!res.ok) {
    const err = new Error(data.error?.message ?? data.error ?? `server ตอบกลับ ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export function register(email, password, displayName) {
  return apiFetch('/api/auth/register', { method: 'POST', body: { email, password, displayName } });
}
export function login(email, password) {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } });
}
export function getMe(token) { return apiFetch('/api/me', { token }); }
export function getReviews(movieId) { return apiFetch(`/api/movies/${movieId}/reviews`); }
export function postReview(movieId, text, token) {
  return apiFetch(`/api/movies/${movieId}/reviews`, { method: 'POST', body: { text }, token });
}
export function putVote(movieId, score, token) {
  return apiFetch(`/api/movies/${movieId}/vote`, { method: 'PUT', body: { score }, token });
}
export function getWishlist(token) { return apiFetch('/api/me/wishlist', { token }); }
export function addToWishlist(movieId, token) {
  return apiFetch(`/api/me/wishlist/${movieId}`, { method: 'PUT', token });
}
export function removeFromWishlist(movieId, token) {
  return apiFetch(`/api/me/wishlist/${movieId}`, { method: 'DELETE', token });
}
export async function getMovies() {
  const data = await apiFetch('/api/movies');
  return data.items;
}
export function getMovie(movieId) { return apiFetch(`/api/movies/${movieId}`); }
