// Accept the ID shown in Chat or its QR URI. Never accept arbitrary URLs.
export function normalizeTopicID(value) {
  let id = String(value || '').trim();
  if (id.startsWith('tinode:///id/')) {
    id = id.slice('tinode:///id/'.length);
  }
  return /^(usr|grp|chn)[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}
