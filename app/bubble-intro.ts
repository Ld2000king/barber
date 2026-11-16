// Glass-bubble intro: swipe the bubble up, it reveals the welcome text through its lens,
// pops into a burst of colourful balls, then the role buttons appear.
// Plain DOM so the same code runs inside React and in a standalone preview.

export type IntroRole = "client" | "barber";
export type IntroOptions = {
  name: string;
  headline?: string;
  subtitle?: string;
  onEnter: (role: IntroRole) => void;
};

type Ball = { x: number; y: number; vx: number; vy: number; r: number; c1: string; c2: string; emoji?: string; rot: number };

const PALETTE: [string, string][] = [
  ["#ff6fd8", "#ffd1f3"], ["#7cf05a", "#e2ffcf"], ["#3aa7ff", "#cfeaff"], ["#ffb02e", "#fff0c9"],
  ["#a66bff", "#eadcff"], ["#ff5a5a", "#ffd6d6"], ["#2ee6c8", "#d0fff6"], ["#d6b988", "#fff4e0"],
];
const EMOJI = ["💈", "✂️", "🪒", "💇‍♂️", "🧔", "✨", "🔥", "💯"];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const esc = (s: string) => s.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));

export function mountBubbleIntro(host: HTMLElement, opts: IntroOptions): () => void {
  const name = esc(opts.name || "BARBERS");
  const headline = opts.headline ?? 'עידן חדש<br/>של <span class="bi-accent">תספורת.</span>';
  const subtitle = esc(opts.subtitle ?? "תורים, מחירון וגלריה — הכל במקום אחד.");
  const welcome = `<h1 class="bi-head">ברוכים הבאים<br/><em><bdi>${name}.</bdi></em></h1><p class="bi-sub">${subtitle}</p>`;

  const root = document.createElement("div");
  root.className = "bi-root";
  root.innerHTML = `
    <div class="bi-a"><h1 class="bi-head bi-head-a">${headline}</h1></div>
    <div class="bi-b">${welcome}</div>
    <canvas class="bi-balls" aria-hidden="true"></canvas>
    <button type="button" class="bi-bubble" aria-label="כניסה לאפליקציה">
      <span class="bi-lens"><span class="bi-lens-inner"><span class="bi-b bi-b-lens">${welcome}</span></span></span>
      <span class="bi-rim"></span><span class="bi-shine"></span>
    </button>
    <div class="bi-hint">החליקו למעלה לכניסה</div>
    <div class="bi-actions">
      <button type="button" class="bi-btn" data-role="client"><span>♙</span>כניסה כלקוח</button>
      <button type="button" class="bi-btn bi-btn-dark" data-role="barber"><span>✂</span>כניסה כספר</button>
    </div>`;
  host.appendChild(root);

  const $ = <T extends HTMLElement>(s: string) => root.querySelector(s) as T;
  const bubble = $<HTMLButtonElement>(".bi-bubble"), lensInner = $<HTMLElement>(".bi-lens-inner");
  const layerA = $<HTMLElement>(".bi-a"), hint = $<HTMLElement>(".bi-hint"), canvas = $<HTMLCanvasElement>(".bi-balls");
  const ctx = canvas.getContext("2d")!;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1;
  let state: "idle" | "drag" | "fly" | "done" = "idle";
  let p = 0;            // drag progress 0..1 (bottom → centre)
  let startY = 0, startP = 0;
  let raf = 0, timers: number[] = [];
  let balls: Ball[] = [], last = 0;

  const bigSize = () => Math.min(W * 0.78, 340);
  const smallSize = () => Math.min(W * 0.46, 190);
  // Bubble geometry for a given progress: big & half-hidden at the bottom → small in the centre.
  function geom(t: number) {
    const size = bigSize() + (smallSize() - bigSize()) * t;
    const top0 = H - bigSize() * 0.42, top1 = H / 2 - smallSize() / 2;
    const top = top0 + (top1 - top0) * t;
    return { size, top, left: (W - size) / 2 };
  }
  function place(t: number) {
    const g = geom(t);
    bubble.style.width = bubble.style.height = `${g.size}px`;
    bubble.style.transform = `translate3d(${g.left}px,${g.top}px,0)`;
    // Lens shows the hidden welcome layer, magnified around the bubble centre.
        lensInner.style.width = `${W}px`; lensInner.style.height = `${H}px`;
    // The text is pulled into the bubble so it is always readable inside it, like a lens.
    lensInner.style.transformOrigin = `${W / 2}px ${H / 2}px`;
    lensInner.style.transform = `translate3d(${g.size / 2 - W / 2}px,${g.size / 2 - H / 2}px,0) scale(${1.5 - t * 0.32})`;
    lensInner.style.opacity = String(clamp(t * 3.5, 0, 1));
    layerA.style.opacity = String(clamp(1 - t * 1.6, 0, 1));
    layerA.style.filter = `blur(${t * 6}px)`;
    hint.style.opacity = String(clamp(1 - t * 3, 0, 1));
  }

  function resize() {
    const r = root.getBoundingClientRect();
    W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    if (state !== "done") place(p);
  }

  // Spring the progress toward a target with a small overshoot, then run `after`.
  function animateTo(target: number, after?: () => void) {
    cancelAnimationFrame(raf);
    let v = 0, prev = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.032); prev = now;
      const k = 170, d = 20;
      v += (k * (target - p) - d * v) * dt; p += v * dt;
      place(p);
      if (Math.abs(target - p) < 0.002 && Math.abs(v) < 0.02) { p = target; place(p); after?.(); return; }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  function commit() {
    if (state === "fly" || state === "done") return;
    state = "fly";
    root.classList.add("bi-flying");
    animateTo(1, pop);
  }

  function pop() {
    state = "done";
    root.classList.add("bi-popped");
    const g = geom(1);
    spawnBalls(W / 2, g.top + g.size / 2);
    timers.push(window.setTimeout(() => root.classList.add("bi-ready"), 650));
  }

  function spawnBalls(x: number, y: number) {
    const n = W < 400 ? 34 : 42;
    for (let i = 0; i < n; i++) {
      const [c1, c2] = PALETTE[i % PALETTE.length];
      const a = Math.random() * Math.PI * 2, s = 350 + Math.random() * 650;
      const isEmoji = i % 4 === 0;
      balls.push({
        x: x + Math.cos(a) * 10, y: y + Math.sin(a) * 10,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 500,
        r: isEmoji ? 15 + Math.random() * 6 : 12 + Math.random() * 26,
        c1, c2, rot: Math.random() * 6, emoji: isEmoji ? EMOJI[(i / 4) % EMOJI.length | 0] : undefined,
      });
    }
    last = performance.now();
    raf = requestAnimationFrame(physics);
  }

  // Balls float up (gravity points to the top) and pile against the top edge.
  function physics(now: number) {
    const dt = Math.min((now - last) / 1000, 0.032); last = now;
    const g = -1500, floor = 0, sub = 2;
    for (let s = 0; s < sub; s++) {
      const h = dt / sub;
      for (const b of balls) {
        b.vy += g * h; b.vx *= 0.995; b.vy *= 0.995;
        b.x += b.vx * h; b.y += b.vy * h; b.rot += b.vx * h * 0.01;
        if (b.y - b.r < floor) { b.y = floor + b.r; b.vy *= -0.35; b.vx *= 0.9; }
        if (b.x - b.r < 0) { b.x = b.r; b.vx *= -0.5; }
        if (b.x + b.r > W) { b.x = W - b.r; b.vx *= -0.5; }
      }
      for (let i = 0; i < balls.length; i++) for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i], b = balls[j], dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) continue;
        const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, over = (min - d) / 2;
        a.x -= nx * over; a.y -= ny * over; b.x += nx * over; b.y += ny * over;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) { const imp = rel * 0.6; a.vx += nx * imp; a.vy += ny * imp; b.vx -= nx * imp; b.vy -= ny * imp; }
      }
    }
    draw();
    raf = requestAnimationFrame(physics);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const b of balls) {
      if (b.emoji) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
        ctx.font = `${b.r * 1.7}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(b.emoji, 0, b.r * 0.08);
        ctx.restore(); continue;
      }
      const gr = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.1, b.x, b.y, b.r);
      gr.addColorStop(0, b.c2); gr.addColorStop(0.55, b.c1); gr.addColorStop(1, shade(b.c1));
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
      ctx.beginPath(); ctx.ellipse(b.x - b.r * 0.32, b.y - b.r * 0.42, b.r * 0.32, b.r * 0.18, -0.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.fill();
    }
  }
  const shade = (hex: string) => {
    const n = parseInt(hex.slice(1), 16), f = 0.7;
    return `rgb(${((n >> 16) & 255) * f | 0},${((n >> 8) & 255) * f | 0},${(n & 255) * f | 0})`;
  };

  // Drag anywhere on the screen to move the bubble up.
  function onDown(e: PointerEvent) {
    if (state !== "idle" || (e.target as HTMLElement).closest(".bi-actions")) return;
    cancelAnimationFrame(raf);
    state = "drag"; startY = e.clientY; startP = p; moved = false;
    downOnBubble = !!(e.target as HTMLElement).closest(".bi-bubble");
    root.setPointerCapture(e.pointerId);
  }
  let moved = false, downOnBubble = false;
  function onMove(e: PointerEvent) {
    if (state !== "drag") return;
    const travel = geom(0).top - geom(1).top;
    const dy = startY - e.clientY;
    if (Math.abs(dy) > 6) moved = true;
    let t = startP + dy / travel;
    if (t < 0) t = t * 0.25;                // rubber-band below the start
    if (t > 1) t = 1 + (t - 1) * 0.2;
    p = t; place(p);
  }
  function onUp() {
    if (state !== "drag") return;
    state = "idle";
    const tapOnBubble = !moved && downOnBubble;
    if (p > 0.32 || tapOnBubble) commit(); else animateTo(0);
  }
  function onClick(e: MouseEvent) {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>("[data-role]");
    if (btn) opts.onEnter(btn.dataset.role as IntroRole);
  }
  function onKey(e: KeyboardEvent) {
    if ((e.key === "Enter" || e.key === " ") && e.target === bubble) { e.preventDefault(); commit(); }
  }

  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointercancel", onUp);
  root.addEventListener("click", onClick);
  bubble.addEventListener("keydown", onKey);
  const ro = new ResizeObserver(resize); ro.observe(root);
  resize();
  if (reduced) { p = 1; place(1); state = "done"; root.classList.add("bi-flying", "bi-popped", "bi-ready"); }
  else requestAnimationFrame(() => root.classList.add("bi-in"));

  return () => {
    cancelAnimationFrame(raf); timers.forEach(clearTimeout); ro.disconnect();
    root.remove();
  };
}
