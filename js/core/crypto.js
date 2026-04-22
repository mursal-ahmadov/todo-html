/**
 * Cryptography module — AES-GCM encryption, PBKDF2 key derivation.
 * All operations use the native Web Crypto API (SubtleCrypto).
 * @module core/crypto
 */

/**
 * Derive a 256-bit AES-GCM key from a passphrase using PBKDF2.
 * @param {string} passphrase
 * @param {Uint8Array} salt  16 random bytes
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string with AES-GCM.
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {Promise<{ciphertext: ArrayBuffer, iv: Uint8Array}>}
 */
export async function encrypt(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return { ciphertext, iv };
}

/**
 * Decrypt an AES-GCM ciphertext.
 * @param {ArrayBuffer} ciphertext
 * @param {Uint8Array} iv
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function decrypt(ciphertext, iv, key) {
  const dec = new TextDecoder();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  return dec.decode(plain);
}

/**
 * Compute SHA-256 hash of a string and return hex string.
 * Used for passphrase verification only (not for secrets).
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function sha256(text) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate 16 random bytes for use as salt or IV.
 * @returns {Uint8Array}
 */
export function randomSalt() {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Convert ArrayBuffer to base64 string.
 * @param {ArrayBuffer} buf
 * @returns {string}
 */
export function bufToBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

/**
 * Convert base64 string to Uint8Array.
 * @param {string} b64
 * @returns {Uint8Array}
 */
export function base64ToBuf(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/**
 * Encrypt a string and pack result as a JSON-serialisable object.
 * Format: { salt: b64, iv: b64, data: b64 }
 * @param {string} plaintext
 * @param {string} passphrase
 * @returns {Promise<{salt: string, iv: string, data: string}>}
 */
export async function encryptWithPassphrase(plaintext, passphrase) {
  const salt = randomSalt();
  const key = await deriveKey(passphrase, salt);
  const { ciphertext, iv } = await encrypt(plaintext, key);
  return {
    salt: bufToBase64(salt),
    iv:   bufToBase64(iv),
    data: bufToBase64(ciphertext),
  };
}

/**
 * Decrypt a packed object produced by encryptWithPassphrase.
 * @param {{salt: string, iv: string, data: string}} packed
 * @param {string} passphrase
 * @returns {Promise<string>}
 */
export async function decryptWithPassphrase(packed, passphrase) {
  const salt = base64ToBuf(packed.salt);
  const iv   = base64ToBuf(packed.iv);
  const data = base64ToBuf(packed.data);
  const key  = await deriveKey(passphrase, salt);
  return decrypt(data, iv, key);
}
