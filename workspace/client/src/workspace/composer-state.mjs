// A draft belongs to the authenticated issuer/subject and one conversation.
// This is legacy draft storage, not an end-to-end encryption keystore.
export function draftKey(account, topic) {
  if (!account || !topic) return null;
  return `oneworkspace.chat.v2.${account}.draft.${topic}`;
}
export function readDraft(storage, account, topic) {
  const key = draftKey(account, topic);
  if (!key) return {text: '', id: null};
  try {
    const value = JSON.parse(storage.getItem(key));
    return value && typeof value.text === 'string' && value.text.length <= 65536 ? value : {text: '', id: null};
  } catch { return {text: '', id: null}; }
}
export function writeDraft(storage, account, topic, text, id = null) {
  const key = draftKey(account, topic);
  if (!key) throw new Error('Sign in before saving a draft.');
  if (text.length > 65536) throw new Error('This draft exceeds the 65,536 character limit.');
  if (text) storage.setItem(key, JSON.stringify({text, id, updated: Date.now()}));
  else storage.removeItem(key);
}
export function shouldSendKey(event, mode) {
  return !!(event.key === 'Enter' && !event.isComposing && event.keyCode !== 229 &&
    (mode === 'plain' ? !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey : event.ctrlKey || event.metaKey));
}
export function acknowledged(ctrl) { return !!ctrl && ctrl.code >= 200 && ctrl.code < 300 && Number.isInteger(ctrl.params?.seq); }
export function clearAccountDrafts(storage, account) {
  const prefix = `oneworkspace.chat.v2.${account}.draft.`;
  const keys = [];
  for (let i = 0; i < storage.length; i++) if (storage.key(i)?.startsWith(prefix)) keys.push(storage.key(i));
  keys.forEach(key => storage.removeItem(key));
}
