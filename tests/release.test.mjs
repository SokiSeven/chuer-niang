import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { memoryId, digest, selectMemories, allMemories, buildProfile, CompanionStore, emotionFor, settingsFrom } from '../plugin/memory.mjs';
import { normalizeConfig, allowedFile } from '../plugin/scanner.mjs';

test('recall prefers relevant facts over unrelated recent documents', () => {
  const master = { files: { '/p/go/notes.md': { summary: 'Go 压测连接池瓶颈，准备分析 pprof', mtimeMs: 100, hash: 'a' }, '/p/shop/new.md': { summary: '购物清单苹果牛奶', mtimeMs: Date.now(), hash: 'b' } } };
  assert.equal(selectMemories(master, {}, 'Go pprof 性能')[0].name, 'notes.md');
  assert.match(buildProfile(master).summary, /连接池/);
});
test('duplicate and forgotten content is excluded from recall', () => {
  const hash = digest('same'); const master = { files: { '/a/x.md': { summary: 'same', hash }, '/b/y.md': { summary: 'same', hash } } };
  assert.equal(selectMemories(master, {}).length, 1);
  assert.equal(allMemories(master, { forgotten: { [memoryId('/a/x.md')]: true }, forgottenHashes: { [hash]: true } }).length, 0);
});
test('manual memory has priority and recently used topics rotate', () => {
  const master = { files: { '/a/x.md': { summary: '压测性能', mtimeMs: 100 }, '/b/y.md': { summary: '项目记录', mtimeMs: 100 } } };
  assert.equal(selectMemories(master, { manual: [{ id: 'manual:one', summary: '我正在学 Go', updatedAt: 100 }] })[0].id, 'manual:one');
  assert.equal(selectMemories(master, { conversation: { memoryIds: [memoryId('/a/x.md')] } })[0].name, 'y.md');
});
test('serialized state updates preserve concurrent notes and recover after errors', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'chuer-state-'));
  try {
    const store = new CompanionStore(join(dir, 'state.json'));
    await Promise.all(Array.from({ length: 20 }, (_, i) => store.update(s => s.manual.push({ id: String(i), summary: 'note' }))));
    assert.equal((await store.read()).manual.length, 20);
    await assert.rejects(store.update(() => { throw Error('bad'); }));
    await store.update(s => { s.outfit = 'normal'; }); assert.equal((await store.read()).outfit, 'normal');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test('emotions expire and night, boredom and settings bounds work', () => {
  assert.equal(emotionFor({ emotion: { name: 'happy', until: 200 } }, 100, 1), 'happy');
  assert.equal(emotionFor({ emotion: { name: 'happy', until: 99 } }, 100, 1), 'sleepy');
  assert.equal(emotionFor({ lastInteraction: 1 }, 1000000, 12), 'bored');
  assert.equal(settingsFrom({ chatterSeconds: 2 }).chatterSeconds, 15);
  assert.equal(settingsFrom({ chatterSeconds: 999 }).chatterSeconds, 300);
});
test('legacy scan settings migrate without expanding roots; sensitive files stay excluded', () => {
  const config = normalizeConfig({ roots: ['/tmp/project'], delayMs: 300, idleMs: 120000, maxFilesPerPass: 500, extensions: ['.MD'] });
  assert.equal(config.filesPerSecond, 20); assert.equal(config.maxFilesPerPass, 2000); assert.equal(config.idleMs, 5000);
  assert.deepEqual(config.roots, ['/tmp/project']); assert.deepEqual(normalizeConfig({ roots: [] }).roots, []);
  assert.equal(allowedFile('secrets.md', config), false); assert.equal(allowedFile('.env.md', config), false); assert.equal(allowedFile('notes.md', config), true);
});

test('Host exposes concrete provenance, persistent outfits, emotions, forget and batch summaries', async () => {
  const home = await mkdtemp(join(tmpdir(), 'chuer-host-')); process.env.DSH_HOME = home;
  const dir = join(home, 'photo-pet'); await mkdir(dir);
  await writeFile(join(dir, 'master.json'), JSON.stringify({ files: { '/work/go/plan.md': { summary: 'Go 压测连接池瓶颈，准备分析 pprof', hash: 'one', mtimeMs: Date.now(), summaryStatus: 'llm' } } }));
  await writeFile(join(dir, 'affinity.json'), JSON.stringify({ affinity: 100 }));
  let system = '', hold;
  const routes = new Map(); const { apply } = await import('../plugin/index.js');
  apply({
    agentDefaultModel: { currentSelection: () => ({ provider: 'test', model: 'fake' }) },
    llm: { async *stream(options) { system = options.system; if (hold) await hold;
      yield { type: 'text-delta', text: system.includes('只输出 JSON 数组') ? '[{"id":"0","summary":"Go 压测项目分析连接池"}]' : '主人，那个 Go 连接池瓶颈查明白没？俺还记着你准备看 pprof 呢喵。' };
      yield { type: 'finish', reason: { kind: 'stop' } };
    } },
    webServer: { getOrigin: () => 'http://127.0.0.1:64480', register: route => { routes.set(route.path, route); } },
    effect: fn => { if (!fn.toString().includes('startScanner(origin)')) fn(); }, on: () => {},
  });
  async function request(path, body, method = 'POST', origin) {
    const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]); req.method = method; req.headers = { origin };
    let raw; const res = { statusCode: 200, setHeader() {}, end(value) { raw = value; } };
    await routes.get(path).handler(req, res); return { status: res.statusCode, data: JSON.parse(raw) };
  }
  const realNow = Date.now; let now = realNow(); Date.now = () => now;
  try {
    await request('/photo-pet/companion', undefined, 'GET');
    assert.equal((await request('/photo-pet/companion', { action: 'outfit', outfit: 'socks' })).data.wearing, 'socks');
    for (let i = 0; i < 3; i++) { now += 1000; await request('/photo-pet/interact', { zone: 'body' }); }
    const after = (await request('/photo-pet/companion', undefined, 'GET')).data;
    assert.equal(after.emotion, 'annoyed'); assert.equal(after.wearing, 'socks');
    assert.equal((await request('/photo-pet/companion', { action: 'remember', text: 'bad' }, 'POST', 'https://other.example')).status, 403);
    now += 3000; const generated = await request('/photo-pet/generate', { hint: 'Go 项目', recent: [] });
    assert.equal(generated.status, 200); assert.match(system, /准备分析 pprof/); assert.match(system, /人设决定语气，记忆决定内容/);
    assert.equal((await request('/photo-pet/companion', { action: 'sources', generationId: generated.data.generationId })).data.memories.length, 1);
    await request('/photo-pet/companion', { action: 'forget', ids: [memoryId('/work/go/plan.md')] });
    now += 3000; await request('/photo-pet/generate', { recent: [] }); assert.doesNotMatch(system, /准备分析 pprof/); assert.doesNotMatch(system, /上一轮你的话/);
    await request('/photo-pet/companion', { action: 'remember', text: '我最近在学 Go 的调度器' });
    const memories = (await request('/photo-pet/companion', { action: 'memories' })).data.memories; assert.equal(memories[0].source, 'manual');
    now += 3000; assert.equal((await request('/photo-pet/summarize', { documents: [{ id: '0', text: 'Go 压测项目' }] })).data.summaries.length, 1);
    let release; hold = new Promise(r => { release = r; }); now += 3000;
    const pending = request('/photo-pet/generate', { recent: [] }); await new Promise(r => setTimeout(r, 30));
    await request('/photo-pet/companion', { action: 'forget', ids: [memories[0].id] }); release();
    assert.match((await pending).data.error, /memory changed/);
  } finally { Date.now = realNow; await rm(home, { recursive: true, force: true }); }
});

const scanner = fileURLToPath(new URL('../plugin/scanner.mjs', import.meta.url));
function runScanner(home, root, url) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scanner], { env: { ...process.env, DSH_HOME: home, PHOTO_PET_SCAN_ROOT: root, PHOTO_PET_SCAN_ONCE: '1', PHOTO_PET_DSH_URL: url } });
    let stderr = ''; child.stderr.on('data', d => { stderr += d; }); child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(Error(stderr)));
  });
}
test('scanner reads about 20/s independently of slow summaries, batches, skips unchanged and retains fallbacks', async () => {
  const base = await mkdtemp(join(tmpdir(), 'chuer-scan-')); const home = join(base, 'home'), root = join(base, 'docs'), dir = join(home, 'photo-pet');
  await mkdir(root, { recursive: true }); await mkdir(dir, { recursive: true });
  let calls = 0, progress = 0, malformed = false;
  const server = createServer(async (req, res) => {
    let body = ''; for await (const b of req) body += b; const input = JSON.parse(body); calls++;
    await new Promise(r => setTimeout(r, 600));
    try { progress = Math.max(progress, JSON.parse(await readFile(join(dir, 'master.json'), 'utf8')).scan.checked); } catch {}
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ summaries: malformed ? [] : input.documents.map(d => ({ id: d.id, summary: `${d.name} 的 Go 连接池项目` })) }));
  }); await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    for (let i = 0; i < 40; i++) await writeFile(join(root, `${String(i).padStart(3, '0')}.md`), `Go 项目 ${i} 压测连接池`);
    await writeFile(join(root, 'secrets.md'), 'excluded'); await writeFile(join(root, 'binary.txt'), 'abc\0def');
    await writeFile(join(dir, 'scan-config.json'), JSON.stringify({ roots: [root], filesPerSecond: 20, maxFilesPerPass: 100 }));
    const url = `http://127.0.0.1:${server.address().port}`, start = Date.now(); await runScanner(home, root, url);
    let master = JSON.parse(await readFile(join(dir, 'master.json'), 'utf8'));
    assert.equal(Object.keys(master.files).length, 40); assert.ok(Date.now() - start >= 1900); assert.ok(progress >= 20); assert.ok(calls < 15);
    assert.ok(Object.values(master.files).every(f => f.summaryStatus === 'llm')); await assert.rejects(access(join(dir, 'scanner.lock')));
    const before = calls; await runScanner(home, root, url); assert.equal(calls, before);
    const forgotten = join(root, '000.md'); await writeFile(join(dir, 'companion.json'), JSON.stringify({ forgotten: { [memoryId(forgotten)]: Date.now() } }));
    await writeFile(join(root, '001.md'), '修改为 Redis 排查'); malformed = true;
    await runScanner(home, root, url); master = JSON.parse(await readFile(join(dir, 'master.json'), 'utf8'));
    assert.equal(master.files[forgotten], undefined); assert.match(master.files[join(root, '001.md')].summary, /Redis/); assert.equal(master.files[join(root, '001.md')].summaryStatus, 'local');
  } finally { await new Promise(r => server.close(r)); await rm(base, { recursive: true, force: true }); }
});
test('scanner pause persists, resumes, and releases the lock on shutdown', async () => {
  const base = await mkdtemp(join(tmpdir(), 'chuer-pause-')); const home = join(base, 'home'), root = join(base, 'docs'), dir = join(home, 'photo-pet');
  await mkdir(root, { recursive: true }); await mkdir(dir, { recursive: true });
  await writeFile(join(root, 'note.md'), 'Go 调度器'); await writeFile(join(dir, 'scan-config.json'), JSON.stringify({ version: 2, roots: [root], idleMs: 100 }));
  await writeFile(join(dir, 'companion.json'), JSON.stringify({ settings: { scanPaused: true } }));
  const child = spawn(process.execPath, [scanner], { env: { ...process.env, DSH_HOME: home, PHOTO_PET_SCAN_ONCE: '0', PHOTO_PET_DSH_URL: '' }, stdio: 'ignore' });
  const exited = new Promise(r => child.on('exit', r));
  try {
    await new Promise(r => setTimeout(r, 250)); await assert.rejects(access(join(dir, 'master.json')));
    await writeFile(join(dir, 'companion.json'), JSON.stringify({ settings: { scanPaused: false } }));
    let resumed = false; for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 100)); try { if (JSON.parse(await readFile(join(dir, 'master.json'), 'utf8')).files[join(root, 'note.md')]) { resumed = true; break; } } catch {} }
    assert.equal(resumed, true);
  } finally { child.kill('SIGTERM'); await exited; await assert.rejects(access(join(dir, 'scanner.lock'))); await rm(base, { recursive: true, force: true }); }
});
