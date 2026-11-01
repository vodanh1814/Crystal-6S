/**
 * PBKDF2-SHA256 password hashing with Web Crypto API.
 * Format: pbkdf2$100000$<b64salt>$<b64hash>
 */

const ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    KEY_BYTES * 8
  );

  const saltB64 = bufferToBase64(salt);
  const hashB64 = bufferToBase64(derivedBits);
  return `pbkdf2$${ITERATIONS}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const iterations = parseInt(parts[1], 10);
  const saltB64 = parts[2];
  const hashB64 = parts[3];

  if (!iterations || !saltB64 || !hashB64) {
    return false;
  }

  const salt = base64ToBuffer(saltB64);
  const expectedHash = base64ToBuffer(hashB64);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as unknown as ArrayBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    expectedHash.length * 8
  );

  return constantTimeCompare(new Uint8Array(derivedBits), expectedHash);
}

async function deriveAesGcmKey(masterSecret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(masterSecret || 'crystal-5s-default-key'));
  return await crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

/**
 * Encrypts sensitive strings (e.g. GitHub token) using AES-GCM-256 before storing in D1.
 * Format: enc:v1:<b64iv>:<b64ciphertext>
 */
export async function encryptSecret(plaintext: string, masterSecret: string): Promise<string> {
  if (!plaintext) return '';
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesGcmKey(masterSecret);
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  return `enc:v1:${bufferToBase64(iv)}:${bufferToBase64(encrypted)}`;
}

/**
 * Decrypts a secret encrypted with encryptSecret.
 */
export async function decryptSecret(storedValue: string, masterSecret: string): Promise<string> {
  if (!storedValue) return '';
  if (!storedValue.startsWith('enc:v1:')) {
    // Legacy plaintext fallback
    return storedValue;
  }
  const parts = storedValue.split(':');
  if (parts.length !== 4) return '';
  try {
    const iv = base64ToBuffer(parts[2]);
    const cipherBytes = base64ToBuffer(parts[3]);
    const key = await deriveAesGcmKey(masterSecret);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as unknown as ArrayBuffer },
      key,
      cipherBytes as unknown as ArrayBuffer
    );
    return new TextDecoder('utf-8').decode(decrypted);
  } catch {
    return '';
  }
}
