import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

function getKey(): Buffer {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY is required before provider credentials can be stored.');
  }

  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex');

  try {
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 32) return decoded;
  } catch {
    // Fall through to the explicit configuration error below.
  }

  throw new Error('INTEGRATION_ENCRYPTION_KEY must be exactly 32 bytes encoded as 64-char hex or base64.');
}

export function encryptSecret(plaintext: string | null | undefined): string | null {
  if (!plaintext) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function decryptSecret(encoded: string | null | undefined): string | null {
  if (!encoded) return null;
  const [version, ivRaw, tagRaw, ciphertextRaw] = encoded.split('.');
  if (version !== VERSION || !ivRaw || !tagRaw || !ciphertextRaw) {
    throw new Error('Unsupported encrypted integration credential format.');
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivRaw, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function randomOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
