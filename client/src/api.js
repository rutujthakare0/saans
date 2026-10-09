const TOKEN_KEY = 'saans_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: token => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};
export async function api(path, options = {}) {
  const token = tokenStore.get();
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && token) tokenStore.clear();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
