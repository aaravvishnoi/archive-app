// Client-side, zero-knowledge file encryption.
// The server (Supabase) only ever sees the bytes produced by encryptBlob —
// it never sees your passphrase or the plaintext file contents.
//
// Format of an encrypted object: [ 16-byte salt | 12-byte IV | ciphertext ]
// The ciphertext already includes the AES-GCM authentication tag.

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const PBKDF2_ITERATIONS = 250_000;

export const VAULT_CHECK_PATH_SUFFIX = ".vault-check";
export const VAULT_CHECK_PLAINTEXT = "archive-vault-ok";

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptBlob(
  data: ArrayBuffer,
  passphrase: string
): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data
  );

  return new Blob([salt, iv, new Uint8Array(ciphertext)]);
}

export async function decryptBlob(
  blob: Blob,
  passphrase: string
): Promise<ArrayBuffer> {
  const buf = new Uint8Array(await blob.arrayBuffer());

  if (buf.length < SALT_LENGTH + IV_LENGTH) {
    throw new Error("This file is too small to be a valid encrypted object.");
  }

  const salt = buf.slice(0, SALT_LENGTH);
  const iv = buf.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = buf.slice(SALT_LENGTH + IV_LENGTH);
  const key = await deriveKey(passphrase, salt);

  try {
    return await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      ciphertext as BufferSource
    );
  } catch {
    throw new Error("Wrong passphrase, or the file is corrupted.");
  }
}

export async function encryptText(
  text: string,
  passphrase: string
): Promise<Blob> {
  return encryptBlob(new TextEncoder().encode(text).buffer as ArrayBuffer, passphrase);
}

export async function decryptText(
  blob: Blob,
  passphrase: string
): Promise<string> {
  const buf = await decryptBlob(blob, passphrase);
  return new TextDecoder().decode(buf);
}
