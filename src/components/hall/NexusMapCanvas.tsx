'use client';

import { useEffect, useRef, useState } from 'react';

// ── Public interface ──────────────────────────────────────────────────────────
export interface StarNodeInput {
  uid: string;
  traitVector?: number[]; // 5-dim [0,1]; falls back to uid-hash if absent
}

// ── Internal physics node ─────────────────────────────────────────────────────
interface PhysNode {
  uid: string;
  tv:  number[];
  x: number; y: number;
  vx: number; vy: number;
  opacity: number;
}

// ── Selected node info (for profile card) ─────────────────────────────────────
interface SelectedInfo {
  uid: string;
  tv:  number[];
  cardX: number; // canvas-local px
  cardY: number;
}

// ── Physics constants (mirrors nexus_map.dart exactly) ────────────────────────
const KR  = 9000;
const KA  = 0.0020;
const KD  = 0.87;
const KMS = 120;
const KMD = 18;
const KBM = 80;
const KBF = 4;
const KST = 0.80;

const TRAIT_LABELS = ['Openness', 'Vitality', 'Intuition', 'Empathy', 'Focus'];
const CARD_W = 220;
const CARD_H = 240;

// ── Helpers ───────────────────────────────────────────────────────────────────

function uidToTraits(uid: string): number[] {
  const acc = [0, 0, 0, 0, 0];
  for (let i = 0; i < uid.length; i++) {
    acc[i % 5] = (acc[i % 5] * 31 + uid.charCodeAt(i)) % 256;
  }
  return acc.map(v => v / 255);
}

function similarity(a: number[], b: number[]): number {
  let sq = 0;
  for (let i = 0; i < 5; i++) { const d = a[i] - b[i]; sq += d * d; }
  return 1 - Math.sqrt(sq) / Math.sqrt(5);
}

function traitRGB(tv: number[]): [number, number, number] {
  return [
    Math.round(tv[0] * 200 + 55),
    Math.round(tv[1] * 200 + 55),
    Math.round(tv[2] * 200 + 55),
  ];
}

function traitRadius(tv: number[]): number {
  return 3.5 + tv[3] * 2.5;
}

function hexToRGB(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// ── Profile card (pure React overlay) ────────────────────────────────────────

function ProfileCard({
  info,
  cardRef,
  onClose,
  theme = 'dark',
}: {
  info: SelectedInfo;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
  theme?: 'light' | 'dark';
}) {
  const [r, g, b] = traitRGB(info.tv);
  const col = `rgb(${r},${g},${b})`;
  const colA = (a: number) => `rgba(${r},${g},${b},${a})`;

  const isLight = theme === 'light';

  return (
    <div
      ref={cardRef}
      className="absolute pointer-events-auto select-none transition-colors duration-500"
      style={{
        left: info.cardX + 18,
        top:  info.cardY - CARD_H / 2,
        width: CARD_W,
        background: isLight ? 'rgba(255,255,255,0.95)' : 'rgba(13,21,32,0.93)',
        border: `1px solid ${isLight ? colA(0.2) : colA(0.35)}`,
        borderRadius: 14,
        boxShadow: isLight 
          ? `0 8px 32px rgba(139, 92, 246, 0.15)` 
          : `0 0 24px ${colA(0.18)}`,
        padding: 16,
        backdropFilter: 'blur(10px)',
        fontFamily: 'monospace',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: col, boxShadow: isLight ? 'none' : `0 0 8px ${col}`, flexShrink: 0,
        }} />
        <span style={{
          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          color: isLight ? '#4C1D95' : 'rgba(232,240,255,0.85)', fontSize: 13, letterSpacing: 1, fontWeight: isLight ? 700 : 400
        }}>
          {info.uid}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.35)', fontSize: 14, lineHeight: 1, padding: 0 }}
        >✕</button>
      </div>

      {/* Trait profile label */}
      <div style={{ color: isLight ? 'rgba(139, 92, 246, 0.5)' : 'rgba(160,184,216,0.4)', fontSize: 9, letterSpacing: 2.5, marginBottom: 8 }}>
        TRAIT PROFILE
      </div>

      {/* Trait bars */}
      {TRAIT_LABELS.map((label, i) => {
        const val = info.tv[i];
        return (
          <div key={label} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ color: isLight ? 'rgba(76, 29, 149, 0.7)' : 'rgba(160,184,216,0.65)', fontSize: 10, letterSpacing: 0.8 }}>
                {label}
              </span>
              <span style={{ color: colA(0.9), fontSize: 10, fontWeight: 600 }}>
                {Math.round(val * 100)}
              </span>
            </div>
            <div style={{
              height: 3, borderRadius: 2,
              background: isLight ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', borderRadius: 2,
                width: `${val * 100}%`,
                background: colA(0.8),
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NexusMapCanvas({
  nodes,
  initialNodeCount = 0,
  theme = 'dark',
}: {
  nodes: StarNodeInput[];
  initialNodeCount?: number;
  theme?: 'light' | 'dark';
}) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);   // direct DOM update each frame
  const physRef     = useRef<PhysNode[]>([]);
  const rafRef      = useRef<number>(0);
  const prevTRef    = useRef<number>(0);
  const selectedRef = useRef<string | null>(null);

  const [selected, setSelected] = useState<SelectedInfo | null>(null);

  // ── Sync incoming nodes (edge-spawn for new arrivals) ─────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const W = canvas?.offsetWidth  || window.innerWidth;
    const H = canvas?.offsetHeight || window.innerHeight;

    for (const nd of nodes) {
      const existing = physRef.current.find(n => n.uid === nd.uid);
      if (existing) {
        // only update tv if caller explicitly provided it
        if (nd.traitVector) existing.tv = nd.traitVector;
        continue;
      }
      // new node: use provided traits or random (same distribution as seed nodes)
      const tv = nd.traitVector ?? [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()];

      const edge = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if      (edge === 0) { x = Math.random() * W; y = 0; }
      else if (edge === 1) { x = W;                  y = Math.random() * H; }
      else if (edge === 2) { x = Math.random() * W; y = H; }
      else                 { x = 0;                  y = Math.random() * H; }

      const dx = W / 2 - x + (Math.random() - 0.5) * 120;
      const dy = H / 2 - y + (Math.random() - 0.5) * 120;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      physRef.current.push({ uid: nd.uid, tv, x, y,
        vx: dx / dist * 200, vy: dy / dist * 200, opacity: 0 });
    }
  }, [nodes]);

  // ── Animation loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    const resize = () => {
      canvas.width  = canvas.offsetWidth  || window.innerWidth;
      canvas.height = canvas.offsetHeight || window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Seed initial nodes after canvas is sized
    if (initialNodeCount > 0 && physRef.current.length === 0) {
      const W0 = canvas.width, H0 = canvas.height;
      const cx = W0 / 2, cy = H0 / 2;
      const spread = Math.min(W0, H0) * 0.22;
      for (let i = 0; i < initialNodeCount; i++) {
        const angle = Math.random() * 2 * Math.PI;
        const r = Math.sqrt(Math.random()) * spread;
        physRef.current.push({
          uid: `__seed_${i}`,
          tv: [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()],
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          opacity: 1.0,
        });
      }
    }

    // Click: pick nearest node, open profile card
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const ns = physRef.current;
      let best: PhysNode | null = null;
      let bestDist = Infinity;
      for (const n of ns) {
        const d = Math.hypot(n.x - mx, n.y - my);
        if (d < Math.max(traitRadius(n.tv) * 5.5, 18) && d < bestDist) {
          bestDist = d; best = n;
        }
      }
      if (best && selectedRef.current !== best.uid) {
        selectedRef.current = best.uid;
        setSelected({ uid: best.uid, tv: [...best.tv], cardX: best.x, cardY: best.y });
      } else {
        selectedRef.current = null;
        setSelected(null);
      }
    };
    canvas.addEventListener('click', onClick);

    const tick = (now: number) => {
      const dt = Math.min((now - prevTRef.current) / 1000, 0.05);
      prevTRef.current = now;
      const ns = physRef.current;
      const n  = ns.length;
      const W  = canvas.width;
      const H  = canvas.height;

      // Physics
      if (n > 0 && dt > 0) {
        const fx = new Float32Array(n);
        const fy = new Float32Array(n);

        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const ni = ns[i], nj = ns[j];
            const dx = ni.x - nj.x, dy = ni.y - nj.y;
            const dSq = Math.max(dx * dx + dy * dy, KMD * KMD);
            const d   = Math.sqrt(dSq);
            const ux = dx / d, uy = dy / d;

            const fr = Math.min(KR / dSq, 350);
            fx[i] += ux * fr;  fy[i] += uy * fr;
            fx[j] -= ux * fr;  fy[j] -= uy * fr;

            const sim = similarity(ni.tv, nj.tv);
            if (sim > KST) {
              const strength = (sim - KST) / (1 - KST);
              const fa = Math.min(KA * dSq * strength, 70);
              fx[i] -= ux * fa;  fy[i] -= uy * fa;
              fx[j] += ux * fa;  fy[j] += uy * fa;
            }
          }

          const p = ns[i];
          if (p.x < KBM)     fx[i] += (KBM - p.x)     * KBF;
          if (p.x > W - KBM) fx[i] -= (p.x - W + KBM) * KBF;
          if (p.y < KBM)     fy[i] += (KBM - p.y)     * KBF;
          if (p.y > H - KBM) fy[i] -= (p.y - H + KBM) * KBF;
        }

        for (let i = 0; i < n; i++) {
          let vx = (ns[i].vx + fx[i] * dt) * KD;
          let vy = (ns[i].vy + fy[i] * dt) * KD;
          const spd = Math.sqrt(vx * vx + vy * vy);
          if (spd > KMS) { vx = vx / spd * KMS; vy = vy / spd * KMS; }
          ns[i].vx = vx; ns[i].vy = vy;
          ns[i].x  = Math.max(8, Math.min(W - 8, ns[i].x + vx * dt));
          ns[i].y  = Math.max(8, Math.min(H - 8, ns[i].y + vy * dt));
          if (ns[i].opacity < 1) ns[i].opacity = Math.min(1, ns[i].opacity + dt / 0.8);
        }
      }

      // Render
      const isLight = theme === 'light';
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = isLight ? '#F5F3FF' : '#0A0E14'; // Lilac background for light mode
      ctx.fillRect(0, 0, W, H);

      // Nebula wisps
      const nebulaCols = isLight 
        ? [
          [0.20, 0.30, 200, '#C4B5FD', 0.12], // Soft Purple
          [0.80, 0.65, 240, '#A5B4FC', 0.10], // Soft Indigo
          [0.50, 0.85, 160, '#DDD6FE', 0.10], // Very Soft Purple
        ]
        : [
          [0.20, 0.30, 200, '#2A3A7A', 0.045],
          [0.80, 0.65, 240, '#1A4A6A', 0.035],
          [0.50, 0.85, 160, '#3A2A6A', 0.035],
        ];

      for (const [xf, yf, r, hex, op] of nebulaCols as [number,number,number,string,number][]) {
        const grd = ctx.createRadialGradient(xf*W, yf*H, 0, xf*W, yf*H, r);
        const [rr,gg,bb] = hexToRGB(hex);
        grd.addColorStop(0, `rgba(${rr},${gg},${bb},${op})`);
        grd.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(xf*W, yf*H, r, 0, Math.PI*2); ctx.fill();
      }

      // Connection lines
      const selUid = selectedRef.current;
      const hasSel = selUid !== null;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const sim = similarity(ns[i].tv, ns[j].tv);
          if (sim <= KST) continue;
          const t = (sim - KST) / (1 - KST);
          const [r1,g1,b1] = traitRGB(ns[i].tv);
          const [r2,g2,b2] = traitRGB(ns[j].tv);
          const rm = (r1+r2)>>1, gm = (g1+g2)>>1, bm = (b1+b2)>>1;
          const nodeOp = Math.min(ns[i].opacity, ns[j].opacity);
          const isConn = hasSel && (ns[i].uid === selUid || ns[j].uid === selUid);

          let lineOp: number, lw: number;
          if (!hasSel)       { lineOp = t * 0.55;         lw = 0.4 + t * 1.2; }
          else if (isConn)   { lineOp = 0.75 + t * 0.25;  lw = 1.2 + t * 2.0; }
          else               { lineOp = t * 0.08;          lw = 0.4; }

          ctx.beginPath();
          ctx.moveTo(ns[i].x, ns[i].y);
          ctx.lineTo(ns[j].x, ns[j].y);
          ctx.strokeStyle = `rgba(${rm},${gm},${bm},${lineOp * nodeOp})`;
          ctx.lineWidth = lw;
          ctx.stroke();
        }
      }

      // Glowing orbs
      for (const node of ns) {
        const [r,g,b] = traitRGB(node.tv);
        const rad = traitRadius(node.tv);
        const op  = node.opacity;
        const cx  = node.x, cy = node.y;

        const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 5.5);
        g1.addColorStop(0, `rgba(${r},${g},${b},${0.12 * op})`);
        g1.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = g1;
        ctx.beginPath(); ctx.arc(cx, cy, rad * 5.5, 0, Math.PI*2); ctx.fill();

        const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 2.6);
        g2.addColorStop(0, `rgba(${r},${g},${b},${0.32 * op})`);
        g2.addColorStop(1, `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(cx, cy, rad * 2.6, 0, Math.PI*2); ctx.fill();

        const g3 = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        g3.addColorStop(0,    `rgba(255,255,255,${op})`);
        g3.addColorStop(0.45, `rgba(${r},${g},${b},${op})`);
        g3.addColorStop(1,    `rgba(${r},${g},${b},0)`);
        ctx.fillStyle = g3;
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2); ctx.fill();

        if (node.uid === selUid) {
          ctx.beginPath(); ctx.arc(cx, cy, rad * 3.5, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, rad * 5.0, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }

      // Update card position to follow selected node each frame
      if (cardRef.current && selUid) {
        const sn = ns.find(n => n.uid === selUid);
        if (sn) {
          const left = Math.min(Math.max(sn.x + 18, 8), W - CARD_W - 8);
          const top  = Math.min(Math.max(sn.y - CARD_H / 2, 8), H - CARD_H - 8);
          cardRef.current.style.left = `${left}px`;
          cardRef.current.style.top  = `${top}px`;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('click', onClick);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    selectedRef.current = null;
    setSelected(null);
  };

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', cursor: 'crosshair' }}
      />
      {selected && (
        <ProfileCard
          info={selected}
          cardRef={cardRef}
          onClose={handleClose}
          theme={theme}
        />
      )}
    </div>
  );
}
