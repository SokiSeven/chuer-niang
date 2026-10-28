import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { encryptPersona } from '../plugin/persona-crypto.mjs';

const input = process.argv[2];
if (!input) {
  console.error('usage: node tools/seal-persona.mjs <plaintext-file> [output.enc]');
  process.exit(1);
}
const output = process.argv[3]
  ? resolve(process.cwd(), process.argv[3])
  : new URL('../plugin/persona.enc', import.meta.url);
const plaintext = await readFile(resolve(process.cwd(), input), 'utf8');
await writeFile(output, `${encryptPersona(plaintext)}\n`, 'utf8');
console.log(`sealed -> ${String(output)}`);
