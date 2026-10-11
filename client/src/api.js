const TOKEN_KEY = 'saans_token';
const PARENT_TOKEN_KEY = 'saans_parent_token';
const TEACHER_TOKEN_KEY = 'saans_teacher_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: token => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY)
};
export const parentTokenStore = {
  get: () => localStorage.getItem(PARENT_TOKEN_KEY),
  set: token => localStorage.setItem(PARENT_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(PARENT_TOKEN_KEY)
};
export const teacherTokenStore = {
  get: () => localStorage.getItem(TEACHER_TOKEN_KEY),
  set: token => localStorage.setItem(TEACHER_TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TEACHER_TOKEN_KEY)
};
export async function api(path, options = {}) {
  const isTeacherPath = path === '/teacher/today' || path === '/teacher/confirm';
  const publicTeacherPath = ['/teacher/login','/teacher/activate'].includes(path) || path.startsWith('/teacher/invite/');
  const token = isTeacherPath ? teacherTokenStore.get() : publicTeacherPath ? null : tokenStore.get();
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  const data = await response.json().catch(() => ({}));
  if ((response.status === 401 || response.status === 403) && token) (isTeacherPath ? teacherTokenStore : tokenStore).clear();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
export async function parentApi(path, options = {}) {
  const token = parentTokenStore.get();
  const response = await fetch(`/api/parent${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && token) parentTokenStore.clear();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
