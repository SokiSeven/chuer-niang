import { readFile } from 'node:fs/promises';
import { decryptPersona } from '../plugin/persona-crypto.mjs';

const payload = await readFile(new URL('../plugin/persona.enc', import.meta.url), 'utf8');
process.stdout.write(decryptPersona(payload));
