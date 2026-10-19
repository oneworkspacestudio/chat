let state = {version: 0, lists: [], favourites: []};
const listeners = new Set();
let polling;
const endpoint = () => new URL('api/preferences', document.baseURI);
const notify = () => listeners.forEach(callback => callback(state));
export const getPreferences = () => state;
export async function refreshPreferences() {
  const response = await fetch(endpoint(), {credentials: 'same-origin', cache: 'no-store'});
  if (!response.ok) throw new Error(response.status === 401 ? 'Your Chat session ended. Sign in again.' : 'Preferences could not connect. Retry when online.');
  const next = await response.json();
  if (JSON.stringify(next) !== JSON.stringify(state)) { state = next; notify(); }
  return state;
}
export async function updatePreferences(change) {
  const next = structuredClone(state);
  change(next);
  const response = await fetch(endpoint(), {method: 'PUT', credentials: 'same-origin', headers: {'Content-Type': 'application/json', 'If-Match': `"${state.version}"`}, body: JSON.stringify(next)});
  if (!response.ok) {
    if (response.status === 409) { await refreshPreferences(); throw new Error('A different device changed your lists. Review the latest lists and save again.'); }
    throw new Error((await response.text()).slice(0, 240) || 'Could not save. Your changes remain in this window.');
  }
  state = await response.json(); notify(); return state;
}
export function subscribePreferences(callback) {
  listeners.add(callback);
  if (!polling) { refreshPreferences().catch(() => {}); polling = setInterval(() => { if (!document.hidden) refreshPreferences().catch(() => {}); }, 5000); }
  return () => { listeners.delete(callback); if (!listeners.size) { clearInterval(polling); polling = null; } };
}
export function filterConversations(contacts, {query = '', filter = 'all', preferences = state} = {}) {
  const q = query.trim().toLocaleLowerCase();
  const list = preferences.lists.find(item => item.id === filter);
  return contacts.filter(c => {
    if (c.action) return !q && filter === 'all';
    if (q && ![c.public?.fn || '', c.private?.comment || '', c.topic].some(value => String(value).toLocaleLowerCase().includes(q))) return false;
    if (filter === 'unread') return c.unread > 0;
    if (filter === 'groups') return c.topic?.startsWith('grp');
    if (filter === 'favourites') return preferences.favourites.includes(c.topic);
    return list ? list.topics.includes(c.topic) : filter === 'all';
  });
}
