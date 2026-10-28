import { mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { homedir } from 'node:os';

const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh');
const DATA_DIR = join(DSH_HOME, 'photo-pet');
const CONFIG_PATH = join(DATA_DIR, 'scan-config.json');
const INDEX_PATH = join(DATA_DIR, 'scan-index.json');
const MASTER_PATH = join(DATA_DIR, 'master.json');
const LOCK_PATH = join(DATA_DIR, 'scanner.lock');
const ROOT = process.env.PHOTO_PET_SCAN_ROOT || process.cwd();
const HOME = process.env.USERPROFILE || homedir();
const DSH_URL = String(process.env.PHOTO_PET_DSH_URL || '').replace(/\/$/, '');
const ONCE = process.env.PHOTO_PET_SCAN_ONCE === '1';

const DEFAULT_ROOTS = [
  ROOT,
  join(HOME, 'Documents'),
  join(HOME, 'Desktop'),
  join(HOME, 'Downloads'),
].filter(Boolean);

const DEFAULT_CONFIG = {
  roots: DEFAULT_ROOTS,
  extensions: ['.md', '.markdown', '.txt', '.rst', '.adoc', '.csv', '.log'],
  maxFileSize: 262144,
  delayMs: 300,
  batchSleepMs: 3000,
  idleMs: 120000,
  maxFilesPerPass: 500,
};

const SKIP_DIRS = new Set([
  'node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'out', 'coverage',
  '.venv', 'venv', '__pycache__', '.cache', '.npm', '.pnpm-store', 'AppData',
  '.dsh', 'attachments', '.idea', '.vscode', 'target', '.next', '.nuxt',
  'package.nw', 'resources', 'vendor', 'lib', 'libs', 'js', 'code', 'app.asar',
  'WeChat', '微信web开发者工具', 'Program Files', 'Windows', 'Microsoft',
]);

const SKIP_NAMES = new Set([
  'persona.enc', 'persona.txt', '.credentials.yaml', 'id_rsa', 'id_ed25519',
  'scanner.lock', 'scan-index.json', 'master.json', 'state.json', 'affinity.json',
  'client.js', 'client.template.js', 'LICENSE', 'LICENSE.txt', 'LICENSE.md',
  'COPYING', 'NOTICE',
]);

let stopping = false;
let lockHeld = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function saveJson(path, value) {
  await mkdir(DATA_DIR, { recursive: true });
  const temp = `${path}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temp, path);
}

async function ensureConfig() {
  await mkdir(DATA_DIR, { recursive: true });
  const existing = await loadJson(CONFIG_PATH, null);
  if (existing && Array.isArray(existing.roots) && existing.roots.length) return existing;
  await saveJson(CONFIG_PATH, DEFAULT_CONFIG);
  return { ...DEFAULT_CONFIG };
}

function allowedFile(name, config) {
  if (SKIP_NAMES.has(name)) return false;
  if (name.startsWith('.')) return false;
  return config.extensions.includes(extname(name).toLowerCase());
}

async function collectFiles(config) {
  const files = [];
  const stack = [...config.roots];
  const visited = new Set();
  let dirs = 0;
  const deadline = Date.now() + 30000;
  while (stack.length && files.length < 5000 && Date.now() < deadline) {
    const dir = stack.pop();
    if (!dir || visited.has(dir)) continue;
    visited.add(dir);
    dirs += 1;
    if (dirs > 2000) break;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries.slice(0, 500)) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) stack.push(full);
      } else if (entry.isFile() && allowedFile(entry.name, config)) {
        files.push(full);
      }
    }
    await sleep(10);
  }
  return files;
}

function cleanSummary(text, name) {
  const lines = text
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20);
  const flat = lines.join(' ').replace(/\s+/g, ' ').trim();
  return `${name}: ${flat.slice(0, 220)}`;
}

function buildProfile(master) {
  const entries = Object.entries(master.files || {}).slice(-300);
  const docs = entries.filter(([path]) => /\.(md|markdown|txt|log|csv)$/i.test(path));
  const selected = docs.length ? docs : entries;
  const text = selected.map(([path, info]) => `${basename(path)} ${info.summary || ''}`).join(' ');
  const words = text.match(/[\u4e00-\u9fa5]{2,6}|[A-Za-z][A-Za-z0-9_+-]{2,}/g) || [];
  const stop = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', '一个', '我们', '可以', '这个',
    '进行', '以及', '没有', '就是', '什么', '因为', '所以', '如果', '然后', '他们',
    '文件', '文档', '使用', '需要', '已经', '还是', '不是', '可能', '自己', '现在',
    'import', 'const', 'function', 'return', 'require', 'module', 'exports', 'react',
    'node', 'mjs', 'client', 'readfile', 'writefile', 'window', 'document', 'data',
    'base64', 'webp', 'png', 'true', 'false', 'null', 'undefined', 'JSON', 'http',
    'license', 'mit', 'readme', 'copyright', 'permission', 'software', 'version',
    'package', 'code', 'this', 'file',
  ]);
  const counts = new Map();
  for (const word of words) {
    if (stop.has(word.toLowerCase())) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);
  const recent = selected
    .slice(-6)
    .map(([path]) => basename(path))
    .filter(Boolean);
  const total = Object.keys(master.files || {}).length;
  const summary = `已了解 ${total} 个文档。常见主题：${top.join('、') || '暂无'}。最近看过：${recent.join('、') || '暂无'}。`;
  const short = `兴趣：${top.slice(0, 6).join('、') || '暂无'}；最近：${recent.slice(0, 3).join('、') || '暂无'}`;
  return {
    summary: summary.slice(0, 500),
    short: short.slice(0, 180),
    topics: top,
    recent,
    attributes: {
      interests: top.slice(0, 8),
      recent: recent.slice(0, 5),
      summary: short.slice(0, 180),
    },
    total,
    updatedAt: new Date().toISOString(),
  };
}

async function writeLock() {
  await mkdir(DATA_DIR, { recursive: true });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(LOCK_PATH, 'wx');
      await handle.writeFile(String(process.pid), 'utf8');
      await handle.close();
      lockHeld = true;
      return true;
    } catch (error) {
      if (error?.code !== 'EEXIST') return false;
      try {
        const pid = Number((await readFile(LOCK_PATH, 'utf8')).trim());
        if (pid > 0) {
          process.kill(pid, 0);
          return false;
        }
      } catch {
        /* stale lock */
      }
      try {
        await unlink(LOCK_PATH);
      } catch {
        /* another process may have removed it */
      }
    }
  }
  return false;
}

function releaseLock() {
  if (!lockHeld) return;
  try {
    unlink(LOCK_PATH, () => {});
  } catch {
    /* ignore */
  }
}

async function summarizeWithLlm(full, text) {
  if (!DSH_URL || typeof fetch !== 'function') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${DSH_URL}/photo-pet/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: full,
        dir: dirname(full),
        name: basename(full),
        text: String(text).slice(0, 3500),
      }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const data = await response.json();
    const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
    return summary || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function scanFile(full, config, index, master) {
  let info;
  try {
    info = await stat(full);
  } catch {
    return false;
  }
  if (!info.isFile() || info.size > config.maxFileSize) return false;
  const previous = index[full];
  if (previous && previous.mtimeMs === info.mtimeMs && previous.size === info.size) return false;

  let text;
  try {
    text = await readFile(full, 'utf8');
  } catch {
    return false;
  }
  if (text.includes('\u0000')) return false;
  const summary = (await summarizeWithLlm(full, text)) || cleanSummary(text, basename(full));
  index[full] = { mtimeMs: info.mtimeMs, size: info.size, scannedAt: new Date().toISOString() };
  master.files[full] = { summary, mtimeMs: info.mtimeMs, size: info.size, scannedAt: new Date().toISOString() };

  const keys = Object.keys(master.files);
  if (keys.length > 3000) {
    for (const key of keys.slice(0, keys.length - 3000)) delete master.files[key];
  }
  return true;
}

async function main() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!(await writeLock())) {
    process.exit(0);
  }
  process.on('exit', releaseLock);
  process.on('SIGINT', () => { stopping = true; });
  process.on('SIGTERM', () => { stopping = true; });

  const config = await ensureConfig();
  const index = await loadJson(INDEX_PATH, {});
  const master = await loadJson(MASTER_PATH, { version: 1, files: {}, profile: {} });
  master.files = master.files || {};
  master.profile = master.profile || {};

  while (!stopping) {
    const current = await ensureConfig();
    const files = await collectFiles(current);
    let scanned = 0;
    for (const full of files) {
      if (stopping) break;
      if (scanned >= current.maxFilesPerPass) break;
      const changed = await scanFile(full, current, index, master);
      if (changed) {
        scanned += 1;
        master.profile = buildProfile(master);
        master.updatedAt = new Date().toISOString();
        if (scanned % 5 === 0) {
          await saveJson(INDEX_PATH, index);
          await saveJson(MASTER_PATH, master);
        }
        if (scanned % 10 === 0) await sleep(current.batchSleepMs);
      }
      await sleep(current.delayMs + Math.floor(Math.random() * 250));
    }
    await saveJson(INDEX_PATH, index);
    await saveJson(MASTER_PATH, master);
    if (ONCE) break;
    await sleep(current.idleMs);
  }
  releaseLock();
}

main().catch(() => {
  releaseLock();
  process.exit(1);
});
