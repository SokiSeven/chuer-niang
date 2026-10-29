window.__ModuleLoader__.load({
  id: 'chuer-niang',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const PET_URL = '/photo-pet/image?kind=pet';
    const PET_SOCKS_URL = '/photo-pet/image?kind=socks';
    const POS_KEY = 'photo-pet:position:v1';
    const LLM_URL = '/photo-pet/generate';
    const NS = 'photo-pet';

    const LINES = {
      zh: {
        aria: '雏儿娘桌宠，点一下会说话，拖动可以换位置，双击归位',
        hello: ['俺是雏儿娘，有啥吩咐，喵'],
        idle: ['俺看你这操作不中，喵。', '主人，俺觉得你该歇歇了，喵。'],
        working: ['俺去办，喵。'],
        waiting: ['主人，喵？'],
        done: ['办好了，喵。'],
        click: ['俺是雏儿娘，有啥吩咐，喵', '主人又点俺，喵。'],
        pat: ['别摸头，摸秃了咋整喵。', '哼，摸一下得了喵。', '俺这脑袋不是给你摸的喵。'],
        poke: ['戳啥戳，戳坏了咋整喵。', '别捅俺腰，忙得很喵。', '再戳俺可要挠你了喵。'],
        foot: ['想闻吗', '舒服 巴适得板 恋足耍起嘛', '哪儿来的野猫，给爷爬，别摸玉足'],
      },
      en: {
        aria: "Chu'er Niang photo pet. Click to talk, drag to move, double-click to reset.",
        hello: ["I am Chu'er Niang. What can I do for you, meow?"],
        idle: ["Chu'er Niang is here, meow."],
        working: ["Chu'er Niang is on it, meow."],
        waiting: ['Master, meow?'],
        done: ['All done, meow.'],
        click: ["I am Chu'er Niang. What can I do for you, meow?"],
        pat: ['Stop petting my head, meow.'],
        poke: ['Stop poking me, meow.'],
        foot: ['Want to smell it?', 'Comfy, meow.'],
      },
    };

    const FOOT_MARKS = [
      { left: '34%', top: '58%', delay: '0s', size: 20 },
      { left: '48%', top: '54%', delay: '0.08s', size: 22, sock: true },
      { left: '60%', top: '60%', delay: '0.16s', size: 20 },
      { left: '40%', top: '66%', delay: '0.24s', size: 18, sock: true },
      { left: '63%', top: '68%', delay: '0.32s', size: 18 },
      { left: '52%', top: '72%', delay: '0.4s', size: 16, sock: true },
      { left: '30%', top: '52%', delay: '0.2s', size: 16 },
    ];

    const RANK_COLORS = ['#9aa0a6', '#d9dee6', '#ffcc4d', '#6ff2d0', '#7fdcff', '#c08bff', '#ff4fd8'];
    const EYE_COLOR = '#ff2b2b';

    function formatXp(value) {
      const xp = Number(value) || 0;
      if (xp >= 1_000_000_000) return `${(xp / 1_000_000_000).toFixed(1)}B`;
      if (xp >= 1_000_000) return `${(xp / 1_000_000).toFixed(1)}M`;
      if (xp >= 1_000) return `${(xp / 1_000).toFixed(0)}K`;
      return String(Math.round(xp));
    }

    const CSS = `
      .pp-root{position:fixed;z-index:2147483000;pointer-events:auto;user-select:none;-webkit-user-select:none;
        touch-action:none;cursor:grab;outline:none;font-family:ui-sans-serif,system-ui,"Segoe UI","Microsoft YaHei",sans-serif;}
      .pp-root.pp-dragging{cursor:grabbing}
      .pp-root:focus-visible .pp-stage{filter:drop-shadow(0 0 0 2px var(--dsw-alias-brand-primary))}
      .pp-stage{position:relative;display:flex;flex-direction:column;align-items:center;transform-origin:50% 100%;
        animation:pp-float 4.6s ease-in-out infinite;}
      .pp-img{display:block;height:380px;width:auto;max-height:46vh;pointer-events:none;position:relative;z-index:2;
        filter:drop-shadow(0 10px 18px rgba(0,0,0,.22));animation:pp-breathe 3.4s ease-in-out infinite;}
      .pp-shadow{position:absolute;left:50%;bottom:-6px;width:56%;height:14px;transform:translateX(-50%);
        border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.26),rgba(0,0,0,0) 70%);
        filter:blur(1px);z-index:-1;pointer-events:none;}
      .pp-bubble{position:absolute;right:0;left:auto;bottom:calc(100% + 6px);max-width:min(360px,calc(100vw - 40px));
        padding:8px 12px;border-radius:12px;background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);
        border:1px solid var(--dsw-alias-border-l1);box-shadow:0 6px 24px rgba(0,0,0,.16);
        font-size:13px;line-height:1.45;white-space:pre-wrap;pointer-events:auto;animation:pp-pop .18s ease-out;}
      .pp-bubble:after{content:"";position:absolute;right:34px;left:auto;top:100%;width:10px;height:10px;
        transform:translateY(-5px) rotate(45deg);background:var(--dsw-alias-bg-overlay);
        border-right:1px solid var(--dsw-alias-border-l1);border-bottom:1px solid var(--dsw-alias-border-l1);}
      .pp-badge{position:absolute;top:-10px;right:-6px;z-index:3;min-width:22px;height:22px;padding:0 6px;
        display:none;align-items:center;justify-content:center;border-radius:999px;font-size:13px;line-height:1;
        background:var(--dsw-alias-bg-overlay);color:var(--dsw-alias-label-primary);
        border:1px solid var(--dsw-alias-border-l1);box-shadow:0 2px 8px rgba(0,0,0,.14);}
      .pp-mood-working .pp-badge,.pp-mood-waiting .pp-badge,.pp-mood-done .pp-badge{display:flex}
      .pp-dots{display:flex;gap:2px;align-items:center}
      .pp-dots i{width:4px;height:4px;border-radius:50%;background:currentColor;animation:pp-dot 1.1s infinite}
      .pp-dots i:nth-child(2){animation-delay:.15s}
      .pp-dots i:nth-child(3){animation-delay:.3s}
      .pp-mood-working .pp-stage{animation-duration:1.7s}
      .pp-mood-working .pp-img{animation-duration:1.9s}
      .pp-mood-waiting .pp-stage{animation:pp-sway 2.6s ease-in-out infinite}
      .pp-mood-done .pp-img{filter:drop-shadow(0 0 10px rgba(255,196,80,.55)) drop-shadow(0 10px 18px rgba(0,0,0,.22))}
      .pp-hop{animation:pp-hop .52s ease-out !important}
      .pp-reaction-pat .pp-img{animation:pp-pat .55s ease}
      .pp-reaction-poke .pp-stage{animation:pp-shake .35s}
      .pp-reaction-foot .pp-img{animation:pp-foot .5s ease}
      .pp-heart,.pp-bang,.pp-foot-mark{position:absolute;left:50%;top:16%;z-index:4;font-size:22px;pointer-events:none;
        animation:pp-float-up 1s ease-out forwards}
      .pp-bang{font-weight:700;color:var(--dsw-alias-state-warn-primary);font-size:24px}
      .pp-foot-mark{font-size:22px}
      .pp-wallet{position:absolute;right:calc(100% + 10px);bottom:0;width:232px;padding:12px;border-radius:14px;
        background:var(--dsw-alias-bg-overlay);border:1px solid var(--dsw-alias-border-l1);
        box-shadow:0 8px 28px rgba(0,0,0,.2);color:var(--dsw-alias-label-primary);font-size:12px;
        pointer-events:auto;z-index:5;}
      .pp-wallet-title{font-weight:600;font-size:13px;margin-bottom:8px;padding-right:18px}
      .pp-wallet-close{position:absolute;top:6px;right:8px;border:0;background:transparent;color:var(--dsw-alias-label-secondary);
        font-size:16px;line-height:1;cursor:pointer;padding:2px 4px}
      .pp-wallet-row{display:flex;justify-content:space-between;gap:8px;line-height:1.75}
      .pp-wallet-row b{font-weight:500}
      .pp-peak{color:var(--dsw-alias-state-error-primary)}
      .pp-offpeak{color:var(--dsw-alias-state-success-primary)}
      .pp-affinity-title{margin-top:8px;font-size:12px;color:var(--dsw-alias-label-secondary)}
      .pp-affinity-bar{height:6px;border-radius:999px;background:var(--dsw-alias-border-l1);overflow:hidden;margin-top:4px}
      .pp-affinity-bar i{display:block;height:100%;border-radius:999px;background:var(--dsw-alias-brand-primary);transition:width .25s}
      .pp-aura{position:absolute;left:50%;bottom:0;width:170px;height:380px;transform:translateX(-50%);z-index:0;pointer-events:none;
        background:radial-gradient(ellipse at 50% 56%,var(--rank-color),transparent 66%);opacity:.16;filter:blur(18px);
        animation:pp-aura 4s ease-in-out infinite}
      .pp-eyes{position:absolute;left:50%;bottom:4px;transform:translateX(-50%);width:122px;height:380px;z-index:3;
        pointer-events:none;mix-blend-mode:screen;filter:drop-shadow(0 0 7px var(--eye-color))}
      .pp-laser{animation:pp-laser 1.6s ease-in-out infinite}
      .pp-rank{position:absolute;right:calc(100% + 10px);top:20%;width:144px;padding:9px 10px;border-radius:12px;
        background:linear-gradient(135deg,rgba(12,14,22,.94),rgba(38,26,58,.94));
        border:1px solid var(--rank-color);color:#fff;pointer-events:none;z-index:6;overflow:hidden;
        box-shadow:0 0 18px var(--rank-color),inset 0 0 14px rgba(255,255,255,.06);
        animation:pp-rank-glow 2.8s ease-in-out infinite}
      .pp-rank-name{font-weight:700;font-size:13px;color:var(--rank-color);text-shadow:0 0 10px var(--rank-color);letter-spacing:.5px}
      .pp-rank-xp{font-size:10px;opacity:.78;margin-top:2px}
      .pp-rank-bar{height:4px;border-radius:999px;background:rgba(255,255,255,.14);margin-top:6px;overflow:hidden}
      .pp-rank-bar i{display:block;height:100%;border-radius:999px;background:var(--rank-color);box-shadow:0 0 8px var(--rank-color);transition:width .3s}
      .pp-rank:after{content:"";position:absolute;inset:0;background:linear-gradient(120deg,transparent 30%,rgba(255,255,255,.25) 50%,transparent 70%);
        transform:translateX(-120%);animation:pp-rank-scan 3.2s infinite}
      @keyframes pp-aura{0%,100%{opacity:.12}50%{opacity:.24}}
      @keyframes pp-laser{0%,100%{opacity:.25}50%{opacity:.9}}
      @keyframes pp-rank-glow{0%,100%{box-shadow:0 0 14px var(--rank-color),inset 0 0 12px rgba(255,255,255,.05)}
        50%{box-shadow:0 0 30px var(--rank-color),inset 0 0 18px rgba(255,255,255,.1)}}
      @keyframes pp-rank-scan{to{transform:translateX(120%)}}
      @keyframes pp-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      @keyframes pp-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.012)}}
      @keyframes pp-sway{0%,100%{transform:rotate(0)}25%{transform:rotate(-1.4deg)}75%{transform:rotate(1.4deg)}}
      @keyframes pp-hop{0%,100%{transform:translateY(0) scale(1)}30%{transform:translateY(-16px) scale(1.03)}
        62%{transform:translateY(0) scale(.992)}}
      @keyframes pp-pop{from{opacity:0;transform:translateY(4px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes pp-dot{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-2px)}}
      @keyframes pp-pat{0%,100%{transform:rotate(0) scale(1)}25%{transform:rotate(-3deg) scale(1.02)}55%{transform:rotate(2deg) scale(.99)}}
      @keyframes pp-foot{0%,100%{transform:rotate(0)}25%{transform:rotate(4deg) scale(1.01)}60%{transform:rotate(-2deg)}}
      @keyframes pp-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
      @keyframes pp-float-up{from{opacity:0;transform:translate(-50%,8px) scale(.8)}30%{opacity:1}to{opacity:0;transform:translate(-50%,-42px) scale(1.2)}}
      @media (prefers-reduced-motion: reduce){.pp-stage,.pp-img,.pp-dots i{animation:none !important}}
      .pp-bubble-actions,.pp-panel-tabs,.pp-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      .pp-root button,.pp-root input,.pp-root textarea,.pp-root select{font:inherit}
      .pp-root button{cursor:pointer;border:1px solid var(--dsw-alias-border-l1,#475569);border-radius:7px;padding:4px 7px;background:var(--dsw-alias-bg-overlay,#172026);color:var(--dsw-alias-label-primary,#eef5f5)}
      .pp-root button:disabled{opacity:.45;cursor:default}
      .pp-panel{box-sizing:border-box;position:fixed;right:16px;bottom:16px;width:min(370px,calc(100vw - 32px));max-height:72vh;overflow:auto;padding:16px;border-radius:16px;background:var(--dsw-alias-bg-overlay,#172026);color:var(--dsw-alias-label-primary,#eef5f5);border:1px solid var(--dsw-alias-border-l1,#475569);box-shadow:0 12px 48px #0005;z-index:10;cursor:default;user-select:text;touch-action:auto;font-size:13px;line-height:1.55}
      .pp-panel input,.pp-panel textarea{box-sizing:border-box;width:100%;padding:8px;margin:6px 0;border-radius:8px;border:1px solid var(--dsw-alias-border-l1,#475569);color:inherit;background:var(--dsw-alias-bg-overlay,#172026)}
      .pp-memory{border-top:1px solid var(--dsw-alias-border-l1,#475569);padding:10px 0;overflow-wrap:anywhere}
      .pp-note{opacity:.72;font-size:12px;white-space:pre-wrap}
      .pp-feeling{position:absolute;left:0;bottom:10%;font-size:20px;z-index:4;pointer-events:none}
      .pp-emotion-happy .pp-stage{animation:pp-happy 2s ease-in-out infinite}
      .pp-emotion-annoyed .pp-stage{animation:pp-dodge 2s ease-out}
      .pp-emotion-sleepy .pp-stage{animation:pp-doze 6s ease-in-out infinite;transform-origin:50% 100%}
      .pp-emotion-bored .pp-stage{animation:pp-sway 5s ease-in-out infinite}
      .pp-changing .pp-img{animation:pp-change .65s ease-out!important}
      @keyframes pp-happy{0%,100%{transform:translateY(0) rotate(-.5deg)}50%{transform:translateY(-8px) rotate(.5deg)}}
      @keyframes pp-doze{0%,100%{transform:rotate(0) scaleY(1)}50%{transform:rotate(3deg) scaleY(.97)}}
      @keyframes pp-dodge{0%,100%{transform:translateX(0)}20%,75%{transform:translateX(26px) rotate(3deg)}}
      @keyframes pp-change{0%{opacity:.15;filter:brightness(2)}100%{opacity:1;filter:brightness(1)}}
      @media(prefers-reduced-motion:reduce){.pp-root *{animation:none!important;transition:none!important}}
    `;

    function pick(list) {
      return list[Math.floor(Math.random() * list.length)];
    }

    function clamp(value, min, max) {
      return Math.min(max, Math.max(min, value));
    }

    function localeKey(locale) {
      return String(locale || '').toLowerCase().startsWith('zh') ? 'zh' : 'en';
    }

    function selectPhase(statuses) {
      let running = false;
      let pending = false;
      if (statuses && typeof statuses.values === 'function') {
        for (const status of statuses.values()) {
          if (!status) continue;
          if (status.pendingInteraction) pending = true;
          if (status.running) running = true;
        }
      }
      if (pending) return 'waiting';
      if (running) return 'working';
      return 'idle';
    }

    function readPosition() {
      try {
        const raw = localStorage.getItem(POS_KEY);
        if (!raw) return null;
        const value = JSON.parse(raw);
        if (!value || typeof value.left !== 'number' || typeof value.top !== 'number') return null;
        if (value.left < -60 || value.top < -60) return null;
        if (value.left > window.innerWidth - 40 || value.top > window.innerHeight - 40) return null;
        return value;
      } catch {
        return null;
      }
    }

    function writePosition(value) {
      try {
        if (value) localStorage.setItem(POS_KEY, JSON.stringify(value));
        else localStorage.removeItem(POS_KEY);
      } catch {
        /* storage is optional */
      }
    }

    async function requestLlmLine(hint, recent) {
      try {
        const response = await fetch(LLM_URL, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hint: hint || '',
            recent: Array.isArray(recent) ? recent : [],
          }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return typeof data.text === 'string' && data.text.trim() ? { ...data, text: data.text.trim() } : null;
      } catch {
        return null;
      }
    }

    function makePet(ctx) {
      function PhotoPet(props) {
        const [locale, setLocale] = React.useState(() => localeKey(ctx.locale.getLocale().active));
        const [position, setPosition] = React.useState(() => readPosition());
        const [bubble, setBubble] = React.useState(null);
        const [mood, setMood] = React.useState('idle');
        const [hop, setHop] = React.useState(false);
        const [dragging, setDragging] = React.useState(false);
        const [reaction, setReaction] = React.useState('');
        const [walletOpen, setWalletOpen] = React.useState(false);
        const [wallet, setWallet] = React.useState(null);
        const [companion, setCompanion] = React.useState(null);
        const [panel, setPanel] = React.useState('');
        const [memoryData, setMemoryData] = React.useState({ memories: [], total: 0 });
        const [note, setNote] = React.useState('');
        const [reply, setReply] = React.useState('');
        const [query, setQuery] = React.useState('');
        const [notice, setNotice] = React.useState('');
        const [busy, setBusy] = React.useState(false);
        const [changing, setChanging] = React.useState(false);
        const companionRef = React.useRef(null);
        const panelRef = React.useRef('');
        const currentGeneration = React.useRef('');
        const lastSpoke = React.useRef(Date.now());
        const changeTimer = React.useRef(0);
        const delayedEvent = React.useRef(0);
        const alive = React.useRef(true);
        const unlockedBefore = React.useRef(null);
        const settingsQueue = React.useRef(Promise.resolve());
        const settingsVersion = React.useRef(0);
        const dragRef = React.useRef(null);
        const rootRef = React.useRef(null);
        const imgRef = React.useRef(null);
        const bubbleTimer = React.useRef(0);
        const moodTimer = React.useRef(0);
        const hopTimer = React.useRef(0);
        const reactionTimer = React.useRef(0);
        const llmBusy = React.useRef(false);
        const recentLines = React.useRef([]);
        const lines = LINES[locale] || LINES.zh;
        const phase = props.useSessionStatus(selectPhase);
        const previousPhase = React.useRef(phase);
        const maxAffinity = Number(wallet?.affinity) >= 100;
        const hideWallet = Number(wallet?.affinity) < 20;
        const rankIndex = Number.isInteger(wallet?.rank?.index) ? wallet.rank.index : 0;
        const rankName = wallet?.rank?.name || '黑铁雏儿';
        const rankColor = RANK_COLORS[rankIndex] || RANK_COLORS[0];
        const rankProgress = Number(wallet?.rank?.progress) || 0;
        const rankXp = Number(wallet?.rank?.xp) || 0;
        const rankNextAt = wallet?.rank?.nextAt ?? null;
        const eyeOpacity = 0.14 + rankIndex * 0.14;
        const eyeBlur = Math.max(0.6, 2.8 - rankIndex * 0.35);

        const say = React.useCallback((text, duration, metadata = {}) => {
          if (!text) return;
          recentLines.current.push(text);
          if (recentLines.current.length > 6) recentLines.current.splice(0, recentLines.current.length - 6);
          clearTimeout(bubbleTimer.current);
          lastSpoke.current = Date.now();
          currentGeneration.current = metadata.generationId || '';
          setBubble({ text, id: Date.now(), ...metadata });
          bubbleTimer.current = setTimeout(() => { if (!panelRef.current) setBubble(null); }, duration || 12000);
        }, []);

        async function companionAction(action, extra = {}) {
          const response = await fetch('/photo-pet/companion', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...extra }) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || '操作失败');
          return data;
        }
        function acceptCompanion(data) {
          if (!alive.current) return;
          companionRef.current = data; setCompanion(data);
          if (unlockedBefore.current === false && data.socksUnlocked) {
            setChanging(true); clearTimeout(changeTimer.current);
            changeTimer.current = setTimeout(() => setChanging(false), 700);
            say('白袜解锁咧！以后想换，就来俺衣柜挑喵。', 10000);
          }
          unlockedBefore.current = data.socksUnlocked;
        }
        async function refreshCompanion() {
          try { const r = await fetch('/photo-pet/companion', { credentials: 'same-origin' }); if (r.ok) acceptCompanion(await r.json()); } catch { /* host unavailable */ }
        }
        async function openPanel(name) {
          setNotice(''); panelRef.current = name; setPanel(name); clearTimeout(bubbleTimer.current);
          if (name === 'memories' || name === 'sources') {
            try { setMemoryData(await companionAction(name, name === 'sources' ? { generationId: currentGeneration.current } : {})); }
            catch { setNotice('记忆暂时读不到，请确认插件已更新并重启 DSH。'); }
          }
        }
        function closePanel() { panelRef.current = ''; setPanel(''); clearTimeout(bubbleTimer.current); bubbleTimer.current = setTimeout(() => setBubble(null), 12000); }
        async function changeSettings(patch) {
          const version = ++settingsVersion.current;
          const previous = companionRef.current || {};
          acceptCompanion({ ...previous, settings: { ...previous.settings, ...patch } });
          const job = settingsQueue.current.then(() => companionAction('settings', { settings: patch }));
          settingsQueue.current = job.catch(() => {});
          try {
            const saved = await job;
            if (version === settingsVersion.current) acceptCompanion(saved);
          } catch {
            if (version === settingsVersion.current) { await refreshCompanion(); setNotice('设置没有保存成功，请重试。'); }
          }
        }

        async function forget(ids) {
          try {
            await companionAction('forget', { ids });
            currentGeneration.current = ''; recentLines.current = []; setBubble(null);
            setMemoryData(d => ({ ...d, memories: d.memories.filter(m => !ids.includes(m.id)), total: Math.max(0, d.total - ids.length) }));
            setNotice('已忘掉。文件记忆不会在下次扫描时重新记回来。');
          } catch { setNotice('没有忘掉成功，请重试。'); }
        }
        async function followUp() {
          if (llmBusy.current) return;
          llmBusy.current = true; setBusy(true); setNotice('');
          const previous = bubble?.text || '';
          const result = await requestLlmLine(`主人接着你刚才的话说：${reply.trim().slice(0, 240) || '接着说说，具体一点。'}。你上一句是：${previous}`, recentLines.current.slice(-6));
          llmBusy.current = false;
          if (!alive.current) return;
          setBusy(false);
          if (result) { say(result.text, 18000, result); setReply(''); }
          else setNotice('这次没接上话，稍等一下再试。');
        }
        React.useEffect(() => {
          alive.current = true; refreshCompanion();
          const timer = setInterval(refreshCompanion, 15000);
          return () => { alive.current = false; clearInterval(timer); clearTimeout(changeTimer.current); clearTimeout(delayedEvent.current); };
        }, []);

        React.useEffect(() => {
          const unsubscribe = ctx.locale.subscribe(() => {
            setLocale(localeKey(ctx.locale.getLocale().active));
          });
          const timer = setTimeout(() => say(pick(lines.hello), 3200), 900);
          const firstLlm = setTimeout(async () => {
            if (!companionRef.current || companionRef.current.settings?.chatter === false || panelRef.current || document.visibilityState === 'hidden' || llmBusy.current) return;
            llmBusy.current = true;
            const text = await requestLlmLine('主人刚打开 DSH，你按人设嘴硬地挑一句刺。', recentLines.current.slice(-6));
            llmBusy.current = false;
            if (text && alive.current && !panelRef.current && companionRef.current?.settings?.chatter !== false) say(text.text, 14000, text);
          }, 3000);
          return () => {
            unsubscribe();
            clearTimeout(timer);
            clearTimeout(firstLlm);
            clearTimeout(bubbleTimer.current);
            clearTimeout(moodTimer.current);
            clearTimeout(hopTimer.current);
            clearTimeout(reactionTimer.current);
          };
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        React.useEffect(() => {
          const previous = previousPhase.current;
          previousPhase.current = phase;
          if (previous === phase) return;
          if (phase === 'working') {
            setMood('working');
            say(pick(lines.working), 2800);
          } else if (phase === 'waiting') {
            setMood('waiting');
            say(pick(lines.waiting), 4200);
          } else if (phase === 'idle' && (previous === 'working' || previous === 'waiting')) {
            setMood('done');
            say(pick(lines.done), 3000);
            clearTimeout(moodTimer.current);
            moodTimer.current = setTimeout(() => setMood('idle'), 3400);
          }
        }, [phase, lines, say]);

        React.useEffect(() => {
          const timer = setInterval(async () => {
            const settings = companionRef.current?.settings;
            if (!settings || settings.chatter === false || panelRef.current || llmBusy.current || document.visibilityState === 'hidden') return;
            if (Date.now() - lastSpoke.current < (settings.chatterSeconds || 30) * 1000) return;
            llmBusy.current = true;
            const result = await requestLlmLine('围绕你记得的具体事情，自然说点新内容。', recentLines.current.slice(-6));
            llmBusy.current = false;
            if (!alive.current || panelRef.current || companionRef.current?.settings?.chatter === false) return;
            if (result) say(result.text, 14000, result);
            else say(pick(lines.idle), 10000);
          }, 1000);
          return () => clearInterval(timer);
        }, [lines, say]);

        const refreshWallet = React.useCallback(async () => {
          try {
            const response = await fetch('/photo-pet/wallet', { credentials: 'same-origin' });
            if (!response.ok) return;
            const data = await response.json();
            if (!alive.current) return;
            setWallet(data);
            if (!panelRef.current && Array.isArray(data.events) && data.events.length) say(data.events[0], 10000);
          } catch {
            /* wallet is optional */
          }
        }, [say]);

        React.useEffect(() => {
          refreshWallet();
          const timer = setInterval(refreshWallet, 30000);
          return () => clearInterval(timer);
        }, [refreshWallet]);

        React.useEffect(() => {
          if (!walletOpen) return undefined;
          refreshWallet();
          const timer = setInterval(refreshWallet, 10000);
          return () => clearInterval(timer);
        }, [walletOpen, refreshWallet]);

        const reactTo = React.useCallback(async (zone) => {
          const kind = zone === 'head' ? 'pat' : zone === 'foot' ? 'foot' : 'poke';
          setReaction(kind);
          clearTimeout(reactionTimer.current);
          reactionTimer.current = setTimeout(() => setReaction(''), 700);
          try {
            const response = await fetch('/photo-pet/interact', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ zone }),
            });
            if (response.ok) {
              const data = await response.json();
              if (!alive.current) return;
              if (data.companion) acceptCompanion(data.companion);
              if (data.line) say(data.line, 10000);
              if (data.event) { clearTimeout(delayedEvent.current); delayedEvent.current = setTimeout(() => say(data.event, 10000), 1500); }
              if (Number.isFinite(data.affinity)) {
                setWallet((current) => (current ? { ...current, affinity: data.affinity, level: data.level } : current));
              }
              return;
            }
          } catch {
            /* fall through to the local line */
          }
          say(pick(kind === 'pat' ? lines.pat : kind === 'foot' ? lines.foot : lines.poke), 2600);
        }, [lines, say]);

        function onPointerDown(event) {
          if (event.button !== undefined && event.button !== 0) return;
          const element = rootRef.current;
          if (!element) return;
          const rect = element.getBoundingClientRect();
          dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            left: rect.left,
            top: rect.top,
            moved: false,
          };
          setDragging(true);
          try {
            element.setPointerCapture(event.pointerId);
          } catch {
            /* pointer capture is best effort */
          }
        }

        function onPointerMove(event) {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          const dx = event.clientX - drag.startX;
          const dy = event.clientY - drag.startY;
          if (!drag.moved && Math.hypot(dx, dy) > 4) drag.moved = true;
          if (!drag.moved) return;
          setPosition({
            left: clamp(drag.left + dx, -20, window.innerWidth - 48),
            top: clamp(drag.top + dy, -20, window.innerHeight - 48),
          });
        }

        function onPointerUp(event) {
          const drag = dragRef.current;
          if (!drag) return;
          dragRef.current = null;
          setDragging(false);
          try {
            rootRef.current?.releasePointerCapture(drag.pointerId);
          } catch {
            /* ignore */
          }
          if (drag.moved) {
            const rect = rootRef.current?.getBoundingClientRect();
            if (rect) writePosition({ left: rect.left, top: rect.top });
          } else {
            const rect = imgRef.current?.getBoundingClientRect();
            const ratio = rect ? (event.clientY - rect.top) / rect.height : 0.6;
            reactTo(ratio < 0.30 ? 'head' : ratio > 0.88 ? 'foot' : 'body');
          }
        }

        function resetPosition() {
          setPosition(null);
          writePosition(null);
          say(locale === 'zh' ? '归位啦。' : 'Back to my corner.', 2200);
        }

        const style = position
          ? { left: position.left + 'px', top: position.top + 'px', right: 'auto', bottom: 'auto' }
          : { right: '26px', bottom: '10px' };

        return h(React.Fragment, null,
          h('style', { key: 'pp-style', dangerouslySetInnerHTML: { __html: CSS } }),
          h('div', {
            ref: rootRef,
            className: 'pp-root pp-emotion-' + (companion?.emotion || 'calm') + (changing ? ' pp-changing' : '') + (dragging ? ' pp-dragging' : ''),
            style,
            role: 'group',
            tabIndex: 0,
            'aria-label': lines.aria,
            onPointerDown,
            onPointerMove,
            onPointerUp,
            onPointerCancel: () => { dragRef.current = null; setDragging(false); },
            onDoubleClick: (event) => { event.preventDefault(); resetPosition(); },
            onContextMenu: (event) => {
              event.preventDefault();
              setWalletOpen((open) => {
                const next = !open;
                if (next) setTimeout(refreshWallet, 0);
                return next;
              });
            },
            onKeyDown: (event) => {
              if (event.key === 'Escape') {
                setWalletOpen(false); closePanel();
                return;
              }
              if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                reactTo('body');
              }
            },
          },
            bubble ? h('div', {
              className: 'pp-bubble', key: bubble.id,
              onPointerDown: e => e.stopPropagation(), onDoubleClick: e => e.stopPropagation(), onContextMenu: e => e.stopPropagation(),
              onMouseEnter: () => clearTimeout(bubbleTimer.current),
              onMouseLeave: () => { if (!panelRef.current) bubbleTimer.current = setTimeout(() => setBubble(null), 6000); },
            }, h('div', { role: 'status' }, bubble.text),
              h('div', { className: 'pp-bubble-actions' },
                h('button', { type: 'button', onClick: () => openPanel('reply') }, '接着聊'),
                bubble.generationId ? h('button', { type: 'button', onClick: () => openPanel('sources') }, '参考记忆') : null,
                h('button', { type: 'button', onClick: () => openPanel('memories') }, '记忆'),
                h('button', { type: 'button', onClick: () => openPanel('wardrobe') }, '衣柜')
              )) : null,
            panel ? h('section', {
              className: 'pp-panel', role: 'dialog', 'aria-label': '雏儿娘陪伴面板',
              onPointerDown: e => e.stopPropagation(), onDoubleClick: e => e.stopPropagation(),
              onContextMenu: e => { e.preventDefault(); e.stopPropagation(); },
            },
              h('button', { type: 'button', style: { float: 'right' }, onClick: closePanel, 'aria-label': '关闭面板' }, '×'),
              h('strong', null, '雏儿娘的小本本'),
              h('nav', { className: 'pp-panel-tabs' }, ...[['reply','接话'],['memories','记忆'],['wardrobe','衣柜'],['settings','设置']].map(([key,label]) => h('button', { type: 'button', key, onClick: () => openPanel(key), 'aria-pressed': panel === key }, label))),
              notice ? h('p', { role: 'status' }, notice) : null,
              panel === 'reply' ? h('div', null,
                h('p', null, bubble?.text || '想聊啥？俺听着呢。'),
                h('textarea', { value: reply, maxLength: 240, rows: 3, placeholder: '接着刚才的话聊……', 'aria-label': '接话内容', onChange: e => setReply(e.target.value) }),
                h('button', { type: 'button', disabled: busy, onClick: followUp }, busy ? '想一想……' : '接着说')
              ) : null,
              panel === 'sources' || panel === 'memories' ? h('div', null,
                h('p', { className: 'pp-note' }, panel === 'sources' ? '这些是生成本句话时提供的参考，不表示每条都实际用于台词。' : `已记住 ${memoryData.total} 条。扫描 ${memoryData.scan?.checked || 0} 个候选文件，待摘要 ${memoryData.scan?.pending || 0} 条。`),
                panel === 'memories' ? h('div', null,
                  h('input', { value: query, placeholder: '搜索项目、文件名或内容', 'aria-label': '搜索记忆', onChange: e => setQuery(e.target.value) }),
                  h('button', { type: 'button', onClick: async () => { try { setMemoryData(await companionAction('memories', { query })); } catch { setNotice('搜索失败'); } } }, '搜索'),
                  h('textarea', { value: note, rows: 2, maxLength: 400, placeholder: '主动告诉她一件想让她记住的事', 'aria-label': '新增记忆', onChange: e => setNote(e.target.value) }),
                  h('button', { type: 'button', disabled: !note.trim(), onClick: async () => { try { await companionAction('remember', { text: note }); setNote(''); await openPanel('memories'); setNotice('记住咧，这条会优先参考。'); } catch { setNotice('记忆没有保存成功'); } } }, '记住这件事')
                ) : null,
                ...memoryData.memories.map(m => h('article', { className: 'pp-memory', key: m.id },
                  h('strong', null, m.source === 'manual' ? '主动记忆' : `${m.project} / ${m.name}`),
                  h('p', null, m.summary), h('div', { className: 'pp-note' }, m.quality === 'local' ? '本地摘录，等待模型摘要' : m.source === 'manual' ? '你主动告诉她的' : '文档摘要'),
                  h('button', { type: 'button', onClick: () => forget([m.id]) }, '忘掉这条'))),
                !memoryData.memories.length ? h('p', null, '这里暂时没有记忆。') : null,
                panel === 'memories' && memoryData.memories.length < memoryData.total ? h('button', { type: 'button', onClick: async () => { try { const next = await companionAction('memories', { query, offset: memoryData.memories.length }); setMemoryData(d => ({ ...next, memories: [...d.memories, ...next.memories] })); } catch { setNotice('加载失败'); } } }, '加载更多') : null
              ) : null,
              panel === 'wardrobe' ? h('div', null,
                h('p', null, companion?.socksUnlocked ? '白袜已永久解锁，可以随时换。' : '好感度达到 100 解锁白袜。'),
                ...[['auto','自动换装'],['normal','日常形象'],['socks','白袜形象']].map(([outfit,label]) => h('button', { key: outfit, type: 'button', disabled: outfit === 'socks' && !companion?.socksUnlocked, 'aria-pressed': companion?.outfit === outfit,
                  onClick: async () => { try { acceptCompanion(await companionAction('outfit', { outfit })); setChanging(true); clearTimeout(changeTimer.current); changeTimer.current = setTimeout(() => setChanging(false), 700); setNotice('换好咧。'); } catch { setNotice('没有换装成功'); } }
                }, label))
              ) : null,
              panel === 'settings' ? h('div', null,
                h('p', null, '当前心情：' + ({ calm:'平静',happy:'开心',annoyed:'闹别扭',sleepy:'困倦',bored:'无聊' }[companion?.emotion] || '平静')),
                h('label', null, h('input', { type: 'checkbox', style: { width:'auto' }, checked: companion?.settings?.chatter !== false, onChange: e => changeSettings({ chatter: e.target.checked }) }), '自动自言自语'),
                h('p', null, '说话间隔'),
                h('select', { 'aria-label':'说话间隔', value: companion?.settings?.chatterSeconds || 30, onChange: e => changeSettings({ chatterSeconds: Number(e.target.value) }) }, ...[15,30,60,120,300].map(n => h('option', { key:n,value:n }, `${n} 秒`))),
                h('p', null, h('label', null, h('input', { type:'checkbox',style:{width:'auto'},checked:!!companion?.settings?.scanPaused,onChange:e=>changeSettings({scanPaused:e.target.checked}) }), '暂停扫描与摘要')),
                h('p', { className: 'pp-note' }, '扫描目标约 20 个候选文件/秒；模型摘要独立排队。')
              ) : null
            ) : null,
            h('div', {
              className: 'pp-rank',
              style: { '--rank-color': rankColor },
            },
              h('div', { className: 'pp-rank-name' }, rankName),
              h('div', { className: 'pp-rank-xp' },
                `${formatXp(rankXp)} XP${rankNextAt ? ` / ${formatXp(rankNextAt)}` : ' · MAX'}`),
              h('div', { className: 'pp-rank-bar' },
                h('i', { style: { width: `${Math.round(rankProgress * 100)}%` } }))
            ),
            walletOpen ? h('div', {
              className: 'pp-wallet',
              onPointerDown: (event) => event.stopPropagation(),
              onDoubleClick: (event) => event.stopPropagation(),
              onContextMenu: (event) => { event.preventDefault(); event.stopPropagation(); },
            },
              h('button', {
                type: 'button',
                className: 'pp-wallet-close',
                'aria-label': 'close',
                onPointerDown: (event) => event.stopPropagation(),
                onClick: () => setWalletOpen(false),
              }, '×'),
              h('div', { className: 'pp-wallet-title' }, '钱包 / 好感度'),
              h('div', { className: 'pp-actions' }, h('button', { type:'button',onClick:()=>openPanel('memories') },'记忆'), h('button',{type:'button',onClick:()=>openPanel('wardrobe')},'衣柜'),h('button',{type:'button',onClick:()=>openPanel('settings')},'设置')),
              h('div', { className: 'pp-wallet-row' },
                h('span', null, '段位'),
                h('b', { style: { color: rankColor } }, rankName)),
              h('div', { className: 'pp-wallet-row' },
                h('span', null, '余额'),
                h('b', null, hideWallet ? '——' : (wallet?.balance != null && Number.isFinite(Number(wallet.balance))
                  ? `¥${Number(wallet.balance).toFixed(2)}`
                  : '读不到'))),
              h('div', { className: 'pp-wallet-row' },
                h('span', null, '家底'),
                h('b', null, hideWallet ? '——' : (wallet?.balanceTier || '未知'))),
              h('div', { className: 'pp-wallet-row' },
                h('span', null, '本会话'),
                h('b', null, hideWallet ? '——' : `${Number(wallet?.sessionTokens ?? 0).toLocaleString()} token`)),
              h('div', { className: 'pp-wallet-row' },
                h('span', null, '今日饭量'),
                h('b', null, hideWallet ? '——' : `${Number(wallet?.todayTokens ?? 0).toLocaleString()} token`)),
              h('div', { className: 'pp-wallet-row' },
                h('span', null, '投喂'),
                h('b', null, hideWallet ? '——' : `${wallet?.feedCount ?? 0} 次`)),
              h('div', { className: 'pp-wallet-row' },
                h('span', null, '峰谷'),
                h('b', { className: wallet?.peak ? 'pp-peak' : 'pp-offpeak' }, wallet?.peak ? '高峰' : '低谷')),
              h('div', { className: 'pp-affinity-title' },
                `好感度 ${wallet?.level || ''} ${wallet?.affinity ?? 0}/100`),
              h('div', { className: 'pp-affinity-bar' },
                h('i', { style: { width: `${wallet?.affinity ?? 0}%` } }))
            ) : null,
            h('div', { className: 'pp-stage pp-mood-' + mood + (reaction ? ' pp-reaction-' + reaction : '') },
              h('div', { className: 'pp-aura', style: { '--rank-color': rankColor }, 'aria-hidden': true }),
              h('svg', {
                className: 'pp-eyes',
                viewBox: '0 0 243 760',
                'aria-hidden': true,
                style: {
                  '--eye-color': EYE_COLOR,
                  opacity: eyeOpacity,
                  filter: `blur(${eyeBlur}px) drop-shadow(0 0 8px ${EYE_COLOR}) drop-shadow(0 0 18px ${EYE_COLOR})`,
                },
              },
                h('ellipse', { cx: 92, cy: 97, rx: 10, ry: 6, fill: EYE_COLOR }),
                h('ellipse', { cx: 142, cy: 97, rx: 10, ry: 6, fill: EYE_COLOR }),
                rankIndex >= 6 ? h(React.Fragment, null,
                  h('line', {
                    x1: 92, y1: 97, x2: 12, y2: 88,
                    stroke: EYE_COLOR, strokeWidth: 4, strokeLinecap: 'round',
                    className: 'pp-laser', filter: 'blur(1.5px)',
                  }),
                  h('line', {
                    x1: 142, y1: 97, x2: 222, y2: 88,
                    stroke: EYE_COLOR, strokeWidth: 4, strokeLinecap: 'round',
                    className: 'pp-laser', filter: 'blur(1.5px)',
                  })
                ) : null
              ),
              reaction === 'pat' ? h('div', { className: 'pp-heart', 'aria-hidden': true }, '💗') : null,
              reaction === 'poke' ? h('div', { className: 'pp-bang', 'aria-hidden': true }, '!') : null,
              reaction === 'foot' ? FOOT_MARKS.map((mark, index) => h('div', {
                key: 'foot-' + index,
                className: 'pp-foot-mark',
                'aria-hidden': true,
                style: {
                  left: mark.left,
                  top: mark.top,
                  animationDelay: mark.delay,
                  fontSize: `${mark.size}px`,
                },
              }, mark.sock ? h('svg', {
                width: mark.size,
                height: mark.size,
                viewBox: '0 0 24 24',
                'aria-hidden': true,
              },
                h('path', {
                  d: 'M8 2h6v9c0 2 1 3 3 4l3 2c1 .7 1 2 0 2.7l-2 1.3c-1 .7-2 .5-3-.2l-5-4c-1-.8-2-2-2-3V2z',
                  fill: '#ffffff',
                  stroke: '#b8b8b8',
                  strokeWidth: 1.2,
                  strokeLinejoin: 'round',
                }),
                h('path', {
                  d: 'M8 2h6v3H8z',
                  fill: '#ececec',
                  stroke: '#b8b8b8',
                  strokeWidth: 1.2,
                })
              ) : '🦶')) : null,
              h('div', { className: 'pp-badge', 'aria-hidden': true },
                mood === 'working' ? h('span', { className: 'pp-dots' }, h('i'), h('i'), h('i'))
                  : mood === 'waiting' ? '?'
                    : mood === 'done' ? '✨' : ''),
              h('img', {
                ref: imgRef,
                className: 'pp-img',
                src: companion ? (companion.wearing === 'socks' ? PET_SOCKS_URL : PET_URL) : (maxAffinity ? PET_SOCKS_URL : PET_URL),
                alt: '',
                draggable: false,
                onDragStart: (event) => event.preventDefault(),
              }),
              h('span', { className: 'pp-feeling', 'aria-hidden': true }, { happy:'♪',annoyed:'💢',sleepy:'Zzz',bored:'…' }[companion?.emotion] || ''),
              h('div', { className: 'pp-shadow', 'aria-hidden': true })
            )
          )
        );
      }

      return PhotoPet;
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'photo-pet',
          order: 100,
        }, makePet(ctx)));
      },
    };
  },
});
