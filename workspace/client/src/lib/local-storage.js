// Helper functions for storing values in localStorage.
// By default localStorage can store only strings, not objects or other types.

export default class LocalStorageUtil {
  static prefix() { return 'oneworkspace.chat.' + (globalThis.workspaceChat?.accountKey || 'anonymous') + '.'; }
  // Replace old object with the new one.
  static setObject(key, value) {
    localStorage.setItem(this.prefix() + key, JSON.stringify(value));
  }

  // Get stored object.
  static getObject(key) {
    const value = localStorage.getItem(this.prefix() + key);
    try { return value && JSON.parse(value); } catch { return null; }
  }

  // Partially or wholly update stored object.
  static updateObject(key, value) {
    const oldVal = this.getObject(key);
    this.setObject(key, Object.assign(oldVal || {}, value));
  }

  // Just a wrapper.
  static removeItem(key) {
    localStorage.removeItem(this.prefix() + key);
  }
}
