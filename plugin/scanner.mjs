import { open, readFile, readdir, stat, unlink, mkdir } from 'node:fs/promises';
import { unlinkSync } from 'node:fs';
import { dirname, basename, extname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { atomicJson, readJson, compact, digest, memoryId, buildProfile } from './memory.mjs';

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const DATA_DIR = join(DSH_HOME, 'photo-pet');
const CONFIG_PATH = join(DATA_DIR, 'scan-config.json');
const INDEX_PATH = join(DATA_DIR, 'scan-index.json');
const MASTER_PATH = join(DATA_DIR, 'master.json');
const COMPANION_PATH = join(DATA_DIR, 'companion.json');
const LOCK_PATH = join(DATA_DIR, 'scanner.lock');
const DSH_URL = String(process.env.PHOTO_PET_DSH_URL || '').replace(/\/$/, '');
const HOME = process.env.USERPROFILE || homedir();
const DEFAULT_ROOTS = [
  process.env.PHOTO_PET_SCAN_ROOT || process.cwd(),
  ...['Documents', 'Desktop', 'Downloads'].map((x) => join(HOME, x)),
];
export const DEFAULT_CONFIG = {
  version: 2,
  roots: DEFAULT_ROOTS,
  extensions: ['.md', '.markdown', '.txt', '.rst', '.adoc', '.csv', '.log'],
  filesPerSecond: 20,
  maxFileSize: 262144,
  maxFilesPerPass: 2000,
  idleMs: 5000,
  summaryBatchSize: 6,
  maxMemories: 10000,
};
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '.hg',
  'dist',
  'build',
  'out',
  'coverage',
  '.venv',
  'venv',
  '__pycache__',
  '.cache',
  '.npm',
  '.pnpm-store',
  'AppData',
  '.dsh',
  'attachments',
  '.idea',
  '.vscode',
  'target',
  '.next',
  '.nuxt',
  'package.nw',
  'resources',
  'vendor',
  'lib',
  'libs',
  'js',
  'code',
  'app.asar',
  'WeChat',
  '微信web开发者工具',
  'Program Files',
  'Windows',
  'Microsoft',
]);

const SKIP_NAMES = new Set([
  'persona.enc',
  'persona.txt',
  '.credentials.yaml',
  'id_rsa',
  'id_ed25519',
  'scanner.lock',
  'scan-index.json',
  'master.json',
  'state.json',
  'affinity.json',
  'client.js',
  'client.template.js',
  'LICENSE',
  'LICENSE.txt',
  'LICENSE.md',
  'COPYING',
  'NOTICE',
]);

SKIP_NAMES.add('companion.json');
export function normalizeConfig(saved = {}) {
  const bounded = (v, fallback, min, max) =>
    Number.isFinite(Number(v)) ? Math.max(min, Math.min(max, Number(v))) : fallback;
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    version: 2,
    roots: Array.isArray(saved.roots)
      ? saved.roots.filter((x) => typeof x === 'string' && x.trim()).map((x) => resolve(x))
      : DEFAULT_ROOTS,
    extensions: Array.isArray(saved.extensions)
      ? saved.extensions.filter((x) => typeof x === 'string').map((x) => x.toLowerCase())
      : DEFAULT_CONFIG.extensions,
    filesPerSecond: bounded(saved.filesPerSecond, 20, 1, 20),
    maxFileSize: bounded(saved.maxFileSize, 262144, 1, 1048576),
    maxFilesPerPass: bounded(
      saved.version !== 2 && saved.maxFilesPerPass === 500 ? 2000 : saved.maxFilesPerPass,
      2000,
      1,
      20000
    ),
    idleMs: bounded(
      saved.version !== 2 && saved.idleMs === 120000 ? 5000 : saved.idleMs,
      5000,
      100,
      120000
    ),
    summaryBatchSize: Math.floor(bounded(saved.summaryBatchSize, 6, 1, 6)),
    maxMemories: Math.floor(bounded(saved.maxMemories, 10000, 100, 20000)),
  };
}
async function config() {
  const saved = await readJson(CONFIG_PATH, {});
  const current = normalizeConfig(saved);
  if (saved.version !== 2) await atomicJson(CONFIG_PATH, current);
  return current;
}
export function allowedFile(name, options) {
  return (
    !name.startsWith('.') &&
    !SKIP_NAMES.has(name) &&
    !/(credential|secret|password|token|private[-_]?key)/i.test(name) &&
    options.extensions.includes(extname(name).toLowerCase())
  );
}
async function* walk(options) {
  const queue = [...new Set(options.roots)];
  const visited = new Set();
  for (let at = 0; at < queue.length; at++) {
    const dir = queue[at];
    if (visited.has(dir)) continue;
    visited.add(dir);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (
        entry.isDirectory() &&
        !entry.name.startsWith('.') &&
        !SKIP_DIRS.has(entry.name) &&
        resolve(full) !== resolve(DATA_DIR)
      )
        queue.push(full);
      else if (entry.isFile() && allowedFile(entry.name, options)) yield full;
    }
    await new Promise((r) => setImmediate(r));
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let stopping = false,
  lockHeld = false,
  requestController;
function releaseLock() {
  if (lockHeld) {
    try {
      unlinkSync(LOCK_PATH);
    } catch {}
    lockHeld = false;
  }
}
async function takeLock() {
  await mkdir(DATA_DIR, { recursive: true });
  for (let n = 0; n < 2; n++) {
    try {
      const h = await open(LOCK_PATH, 'wx');
      await h.writeFile(String(process.pid));
      await h.close();
      lockHeld = true;
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
    }
    try {
      const pid = Number(await readFile(LOCK_PATH, 'utf8'));
      if (pid > 0) {
        process.kill(pid, 0);
        return false;
      }
    } catch (e) {
      if (e.code === 'EPERM') return false;
    }
    await unlink(LOCK_PATH).catch(() => {});
  }
  return false;
}
export async function main() {
  if (!(await takeLock())) return;
  const stop = () => {
    stopping = true;
    requestController?.abort();
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  process.on('exit', releaseLock);
  const index = await readJson(INDEX_PATH, {});
  const master = await readJson(MASTER_PATH, { version: 2, files: {}, profile: {} });
  master.files ||= {};
  master.version = 2;
  const summaryCache = new Map(
    Object.values(master.files)
      .filter((f) => f.hash && f.summaryStatus === 'llm')
      .map((f) => [f.hash, f.summary])
  );
  let options = await config(),
    companion = await readJson(COMPANION_PATH, {}),
    iterator,
    signature = '',
    checked = 0,
    changed = 0;
  let generation = 0,
    flushed = -1,
    flushQueue = Promise.resolve(),
    summaryWorker = null,
    lastTick = 0,
    lastControl = 0;
  async function flush(force = false) {
    const job = flushQueue.then(async () => {
      if (!force && flushed === generation) return;
      const captured = generation;
      companion = await readJson(COMPANION_PATH, {});
      const visible = Object.entries(master.files).filter(
        ([p]) => !companion.forgotten?.[memoryId(p)]
      );
      const excess = Object.keys(master.files).length - options.maxMemories;
      if (excess > 0) {
        for (const [p] of Object.entries(master.files)
          .sort((a, b) => (a[1].scannedAt || '').localeCompare(b[1].scannedAt || ''))
          .slice(0, excess))
          delete master.files[p];
      }
      master.profile = buildProfile(master, companion);
      master.updatedAt = new Date().toISOString();
      master.scan = {
        checked,
        changed,
        pending: visible.filter(([, f]) => f.summaryStatus !== 'llm').length,
        filesPerSecond: options.filesPerSecond,
        lastError: master.scan?.lastError || '',
      };
      // Write master first: a crash before index commit simply causes an incremental rescan.
      await atomicJson(MASTER_PATH, master);
      await atomicJson(INDEX_PATH, index);
      flushed = captured;
    });
    flushQueue = job.catch(() => {});
    return job;
  }
  function kickSummaries() {
    if (summaryWorker || !DSH_URL || stopping || companion.settings?.scanPaused) return;
    summaryWorker = (async () => {
      while (!stopping) {
        companion = await readJson(COMPANION_PATH, {});
        if (companion.settings?.scanPaused) break;
        const hashes = new Set();
        const batch = Object.entries(master.files)
          .filter(
            ([p, f]) =>
              f.summaryStatus !== 'llm' &&
              f.excerpt &&
              !companion.forgotten?.[memoryId(p)] &&
              !companion.forgottenHashes?.[f.hash] &&
              (f.retryAt || 0) <= Date.now()
          )
          .filter(([, f]) => {
            if (hashes.has(f.hash)) return false;
            hashes.add(f.hash);
            return true;
          })
          .slice(0, options.summaryBatchSize);
        if (!batch.length) break;
        const snapshot = batch.map(([path, f], i) => ({
          id: String(i),
          path,
          name: basename(path),
          text: f.excerpt,
          hash: f.hash,
        }));
        requestController = new AbortController();
        const timeout = setTimeout(() => requestController.abort(), 25000);
        try {
          const response = await fetch(`${DSH_URL}/photo-pet/summarize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documents: snapshot.map(({ hash, ...d }) => d) }),
            signal: requestController.signal,
          });
          if (!response.ok) throw new Error(`summary HTTP ${response.status}`);
          const { summaries } = await response.json();
          if (!Array.isArray(summaries)) throw new Error('invalid batch summary');
          for (const item of snapshot) {
            const file = master.files[item.path];
            if (!file || file.hash !== item.hash) continue;
            const result = summaries.find(
              (x) => x.id === item.id && typeof x.summary === 'string' && x.summary.trim()
            );
            if (result) {
              const summary = compact(result.summary, 400);
              summaryCache.set(file.hash, summary);
              for (const sibling of Object.values(master.files))
                if (sibling.hash === file.hash) {
                  sibling.summary = summary;
                  sibling.summaryStatus = 'llm';
                  delete sibling.excerpt;
                  delete sibling.retryAt;
                }
            } else file.retryAt = Date.now() + 60000;
          }
          master.scan = { ...master.scan, lastError: '' };
        } catch (e) {
          for (const item of snapshot) {
            const f = master.files[item.path];
            if (f?.hash === item.hash) f.retryAt = Date.now() + 60000;
          }
          master.scan = { ...master.scan, lastError: compact(e.message, 160) };
        } finally {
          clearTimeout(timeout);
          requestController = null;
          generation++;
          await flush();
        }
        await sleep(450);
      }
    })().finally(() => {
      summaryWorker = null;
    });
  }
  try {
    while (!stopping) {
      options = await config();
      companion = await readJson(COMPANION_PATH, {});
      if (companion.settings?.scanPaused) {
        await sleep(500);
        continue;
      }
      const nextSignature = JSON.stringify([options.roots, options.extensions]);
      if (!iterator || nextSignature !== signature) {
        iterator = walk(options);
        signature = nextSignature;
      }
      let count = 0,
        done = false;
      while (!stopping && count < options.maxFilesPerPass) {
        if (Date.now() - lastControl >= 1000) {
          companion = await readJson(COMPANION_PATH, {});
          lastControl = Date.now();
          if (companion.settings?.scanPaused) break;
        }
        const entry = await iterator.next();
        if (entry.done) {
          done = true;
          break;
        }
        await sleep(Math.max(0, 1000 / options.filesPerSecond - (Date.now() - lastTick)));
        lastTick = Date.now();
        count++;
        checked++;
        const full = entry.value,
          id = memoryId(full);
        if (companion.forgotten?.[id]) {
          delete master.files[full];
          generation++;
          continue;
        }
        let info;
        try {
          info = await stat(full);
        } catch {
          continue;
        }
        if (!info.isFile() || info.size > options.maxFileSize) continue;
        const previous = index[full];
        if (
          previous &&
          previous.mtimeMs === info.mtimeMs &&
          previous.size === info.size &&
          previous.version === 2
        )
          continue;
        let text;
        try {
          text = await readFile(full, 'utf8');
        } catch {
          continue;
        }
        if (text.includes('\u0000')) continue;
        const hash = digest(text),
          old = master.files[full];
        if (companion.forgottenHashes?.[hash]) {
          delete master.files[full];
          index[full] = { mtimeMs: info.mtimeMs, size: info.size };
          generation++;
          continue;
        }
        index[full] = {
          version: 2,
          mtimeMs: info.mtimeMs,
          size: info.size,
          scannedAt: new Date().toISOString(),
        };
        master.files[full] = {
          ...old,
          hash,
          mtimeMs: info.mtimeMs,
          size: info.size,
          project: basename(dirname(full)),
          scannedAt: index[full].scannedAt,
          ...(old?.hash === hash
            ? {}
            : {
                summary: `${basename(full)}：${compact(text, 320)}`,
                excerpt: compact(text, 1200),
                summaryStatus: 'local',
                retryAt: 0,
              }),
        };
        if (summaryCache.has(hash)) {
          const f = master.files[full];
          f.summary = summaryCache.get(hash);
          f.summaryStatus = 'llm';
          delete f.excerpt;
        }
        changed++;
        generation++;
        kickSummaries();
        if (count % 20 === 0) await flush();
      }
      await flush(true);
      kickSummaries();
      if (process.env.PHOTO_PET_SCAN_ONCE === '1') break;
      if (done) {
        iterator = null;
        await sleep(options.idleMs);
      }
    }
    if (summaryWorker) await summaryWorker;
    await flush(true);
  } finally {
    releaseLock();
    process.off('SIGTERM', stop);
    process.off('SIGINT', stop);
    process.off('exit', releaseLock);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((e) => {
    releaseLock();
    console.error(e.message);
    process.exitCode = 1;
  });
