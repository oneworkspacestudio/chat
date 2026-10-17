import { KNOWN_HOSTS, DEFAULT_HOST } from '../config.js';

// Detect server address from the URL
export function detectServerAddress() {
  return window.workspaceChat.host;
}

// Detect if the page is served over HTTPS.
export function isSecureConnection() {
  if (typeof window.location == 'object') {
    return window.location.protocol == 'https:';
  }
  return false;
}

export function isLocalHost() {
  if (typeof window.location == 'object') {
    return window.location.hostname == 'localhost' || window.location.hostname == '127.0.0.1';
  }
  return false;
}
