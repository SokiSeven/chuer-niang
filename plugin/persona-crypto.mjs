// Not real security: the key material ships with the code, so this is a
// speed bump, not a lock. The model still receives the decrypted plaintext.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const FRAGMENTS = ['cGhvdG8tcGV0', 'LWtleS12MQ==', 'LTIwMjY='];

function key() {
  const material = FRAGMENTS
    .map((part) => Buffer.from(part, 'base64').toString('utf8'))
    .reverse()
    .join('|');
  return createHash('sha256').update(material).update('photo-pet:persona:v1').digest();
}

export function encryptPersona(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const box = {
    v: 1,
    alg: 'aes-256-gcm',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
  return Buffer.from(JSON.stringify(box), 'utf8').toString('base64url');
}

export function decryptPersona(payload) {
  const raw = Buffer.from(String(payload).trim(), 'base64url').toString('utf8');
  const box = JSON.parse(raw);
  if (box.v !== 1 || box.alg !== 'aes-256-gcm') throw new Error('unsupported persona envelope');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(box.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(box.tag, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(box.data, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}
