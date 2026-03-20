"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useOnboardingStore } from '@/context/OnboardingContext';
import { calculateSoulVector } from '@/lib/utils';
import { RotateCcw } from 'lucide-react';

const TOTAL_ROUNDS = 10;
const SWIPE_THRESHOLD = 45;

// 10 questions — left = intuition/chaos, right = precision/order
const QUESTIONS: { prompt: string; left: string; right: string }[] = [
  { prompt: '面对未知，你更倾向于',  left: '跟随直觉',  right: '分析数据'  },
  { prompt: '理想的周末是',          left: '随心而动',  right: '提前规划'  },
  { prompt: '解决问题时，你习惯',    left: '发散联想',  right: '逐步推理'  },
  { prompt: '你更享受',              left: '开放探索',  right: '精确掌控'  },
  { prompt: '做决定时你看重',        left: '感受与共鸣', right: '逻辑与证据' },
  { prompt: '你倾向于把想法',        left: '大胆分享',  right: '打磨后再说' },
  { prompt: '创作时你偏好',          left: '即兴灵感',  right: '严密结构'  },
  { prompt: '面对变化，你通常',      left: '欣然拥抱',  right: '深思熟虑'  },
  { prompt: '你的思维方式更像',      left: '网状发散',  right: '线性推进'  },
  { prompt: '你相信好的结果来自',    left: '内在感应',  right: '外在秩序'  },
];

// 4-frame walk cycle — wider leg swing & more bob for "on-path" feel
const WALK_FRAMES = [
  { ll: -28, rl: 18,  bob: 0,  tilt: -2.5 },
  { ll: -9,  rl: 6,   bob: -5, tilt: -0.8 },
  { ll: 18,  rl: -28, bob: 0,  tilt: 2.5  },
  { ll: 6,   rl: -9,  bob: -5, tilt: 0.8  },
];

// Layout percentages (character at center-low, portals at upper corners)
const CHAR = { x: 0.50, y: 0.63 };
const LEFT  = { x: 0.16, y: 0.20 };
const RIGHT = { x: 0.84, y: 0.20 };

// ── Ida-style character ──────────────────────────────────────────────────────
function IdaFigure({ frame, facingLeft }: { frame: number; facingLeft: boolean }) {
  const f = WALK_FRAMES[frame % 4];
  return (
    <svg width="68" height="135" viewBox="0 0 72 140"
      style={{ transform: `scaleX(${facingLeft ? -1 : 1})`, overflow: 'visible' }}>
      <defs>
        <linearGradient id="ds" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="hs" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      {/* Shadow */}
      <ellipse cx="36" cy="136" rx="20" ry="4" fill="rgba(0,0,0,0.14)" />
      {/* Left leg */}
      <rect x={25.5} y={97} width={7} height={28} rx={3.5} fill="#1A1A2E"
        transform={`rotate(${f.ll},29,97)`} />
      {/* Right leg */}
      <rect x={37.5} y={97} width={7} height={28} rx={3.5} fill="#1A1A2E"
        transform={`rotate(${f.rl},41,97)`} />
      {/* Body group — tilts while walking */}
      <g transform={`rotate(${f.tilt},36,${50+f.bob})`}>
        {/* Dress */}
        <path d={`M22,${52+f.bob} C13,${67+f.bob} 8,${82+f.bob} 11,${98+f.bob} Q36,${107+f.bob} 61,${98+f.bob} C64,${82+f.bob} 59,${67+f.bob} 50,${52+f.bob} Z`} fill="#F7F7F7" />
        <path d={`M36,${52+f.bob} C42,${63+f.bob} 53,${76+f.bob} 55,${93+f.bob} Q58,${96+f.bob} 61,${98+f.bob} C64,${82+f.bob} 59,${67+f.bob} 50,${52+f.bob} Z`} fill="url(#ds)" />
        {/* Collar shadow */}
        <ellipse cx="36" cy={57+f.bob} rx="13" ry="8" fill="#1A1A2E" />
        {/* Head */}
        <ellipse cx="36" cy={44+f.bob} rx="14" ry="17" fill="#F7F7F7" />
        <path d={`M36,${27+f.bob} A14,17 0 0,1 50,${44+f.bob} A14,17 0 0,1 36,${61+f.bob} Z`} fill="rgba(0,0,0,0.06)" />
        {/* Hat */}
        <polygon points={`36,${3+f.bob} 19,${37+f.bob} 53,${37+f.bob}`} fill="#F7F7F7" />
        <polygon points={`36,${3+f.bob} 53,${37+f.bob} 44,${37+f.bob}`} fill="url(#hs)" />
        <ellipse cx="36" cy={37+f.bob} rx="17" ry="4" fill="#ECECEC" />
      </g>
    </svg>
  );
}

// ── Per-round scene placeholder configs ─────────────────────────────────────
// colors: [fill, accent] — left side warm palette, right side cool palette
// sides: number of polygon vertices for the placeholder shape
const SCENE_CONFIGS: {
  left:  { colors: [string, string]; sides: number };
  right: { colors: [string, string]; sides: number };
}[] = [
  { left:  { colors: ['#D4904A', '#F0C080'], sides: 3 },  right: { colors: ['#4A90D4', '#80C0F0'], sides: 4 } },
  { left:  { colors: ['#D44A70', '#F090B4'], sides: 5 },  right: { colors: ['#4AD4B0', '#80F0D8'], sides: 6 } },
  { left:  { colors: ['#A84AD4', '#D490F0'], sides: 6 },  right: { colors: ['#D4C44A', '#F0E880'], sides: 3 } },
  { left:  { colors: ['#4AD490', '#80F0C0'], sides: 4 },  right: { colors: ['#D44A90', '#F080C4'], sides: 5 } },
  { left:  { colors: ['#D4A04A', '#F0CC80'], sides: 7 },  right: { colors: ['#4A6AD4', '#80A0F0'], sides: 3 } },
  { left:  { colors: ['#8CD44A', '#C0F080'], sides: 3 },  right: { colors: ['#D44A4A', '#F08080'], sides: 7 } },
  { left:  { colors: ['#4AC8D4', '#80E8F0'], sides: 5 },  right: { colors: ['#C84AD4', '#F080F4'], sides: 4 } },
  { left:  { colors: ['#D4884A', '#F0B880'], sides: 6 },  right: { colors: ['#4AD468', '#80F0A8'], sides: 5 } },
  { left:  { colors: ['#D46A4A', '#F0A080'], sides: 4 },  right: { colors: ['#4A88D4', '#80B8F0'], sides: 6 } },
  { left:  { colors: ['#C8D44A', '#E8F080'], sides: 5 },  right: { colors: ['#884AD4', '#B880F0'], sides: 3 } },
];

// ── Scene SVG: two full-screen immersive scenes + V-paths ───────────────────
function SceneSVG({ litSide, viewW, viewH, round }: {
  litSide: 'left' | 'right' | null;
  viewW: number;
  viewH: number;
  round: number;
}) {
  const W = viewW, H = viewH;
  const cx = W * CHAR.x;
  const cy = H * CHAR.y;
  const lx = W * LEFT.x,  ly = H * LEFT.y;
  const rx = W * RIGHT.x, ry = H * RIGHT.y;

  const buildPath = (sx: number, sy: number, ex: number, ey: number) => {
    const dx = ex - sx, dy = ey - sy;
    const len = Math.sqrt(dx*dx + dy*dy);
    const perpX = -dy/len, perpY = dx/len;
    const dirX  =  dx/len, dirY  = dy/len;
    const hw_near = 14, hw_far = 2.5;
    const dep_near = 14, dep_far = 3;
    const A = { x: sx + perpX*hw_near, y: sy + perpY*hw_near };
    const B = { x: sx - perpX*hw_near, y: sy - perpY*hw_near };
    const C = { x: ex - perpX*hw_far,  y: ey - perpY*hw_far  };
    const D = { x: ex + perpX*hw_far,  y: ey + perpY*hw_far  };
    const numTiles = 16;
    const tiles = Array.from({ length: numTiles - 1 }, (_, i) => {
      const t = Math.sqrt((i + 1) / numTiles);
      const hw_t = hw_near * (1 - t) + hw_far * t;
      const mx = sx + dx*t, my = sy + dy*t;
      return { x1: mx + perpX*hw_t, y1: my + perpY*hw_t,
               x2: mx - perpX*hw_t, y2: my - perpY*hw_t };
    });
    const nearIsAD = (A.y + D.y) >= (B.y + C.y);
    const nearPts: [{ x:number;y:number }, { x:number;y:number }] =
      nearIsAD ? [A, D] : [B, C];
    const farPts: [{ x:number;y:number }, { x:number;y:number }] =
      nearIsAD ? [B, C] : [A, D];
    return { A, B, C, D, tiles, nearPts, farPts, dep_near, dep_far,
             dx, dy, len, perpX, perpY, dirX, dirY, hw_near, hw_far };
  };

  const L = buildPath(cx, cy, lx, ly);
  const R = buildPath(cx, cy, rx, ry);

  // ── Isometric cube ──────────────────────────────────────────────────────────
  const isoCube = (
    tx: number, ty: number, S: number, Hc: number,
    cTop: string, cLeft: string, cRight: string,
    edgeCol = 'rgba(0,240,255,0.55)', sw = 0.7,
  ) => {
    const rr  = S * 0.866;
    const top = `${tx},${ty} ${tx+rr},${ty+S*0.5} ${tx},${ty+S} ${tx-rr},${ty+S*0.5}`;
    const lf  = `${tx-rr},${ty+S*0.5} ${tx},${ty+S} ${tx},${ty+S+Hc} ${tx-rr},${ty+S*0.5+Hc}`;
    const rf  = `${tx+rr},${ty+S*0.5} ${tx},${ty+S} ${tx},${ty+S+Hc} ${tx+rr},${ty+S*0.5+Hc}`;
    return (
      <g>
        <polygon points={rf}  fill={cRight} stroke={edgeCol} strokeWidth={sw} />
        <polygon points={lf}  fill={cLeft}  stroke={edgeCol} strokeWidth={sw} />
        <polygon points={top} fill={cTop}   stroke={edgeCol} strokeWidth={sw} />
      </g>
    );
  };

  // ── Cube with clockwork gear traces + rack teeth ────────────────────────────
  const isoCubeCircuit = (
    tx: number, ty: number, S: number, Hc: number,
    cTop: string, cLeft: string, cRight: string,
    edgeCol = 'rgba(0,240,255,0.68)', sw = 0.85,
  ) => {
    const rr  = S * 0.866;
    const top = `${tx},${ty} ${tx+rr},${ty+S*0.5} ${tx},${ty+S} ${tx-rr},${ty+S*0.5}`;
    const lf  = `${tx-rr},${ty+S*0.5} ${tx},${ty+S} ${tx},${ty+S+Hc} ${tx-rr},${ty+S*0.5+Hc}`;
    const rf  = `${tx+rr},${ty+S*0.5} ${tx},${ty+S} ${tx},${ty+S+Hc} ${tx+rr},${ty+S*0.5+Hc}`;
    const ccx = tx, ccy = ty + S * 0.5;
    const tOp = 0.42;
    // Hexagonal gear outline in isometric top-face plane
    const hp = [
      [ccx,           ty + S*0.12],
      [ccx + rr*0.56, ty + S*0.36],
      [ccx + rr*0.56, ty + S*0.64],
      [ccx,           ty + S*0.88],
      [ccx - rr*0.56, ty + S*0.64],
      [ccx - rr*0.56, ty + S*0.36],
    ];
    return (
      <g>
        <polygon points={rf}  fill={cRight} stroke={edgeCol} strokeWidth={sw} />
        <polygon points={lf}  fill={cLeft}  stroke={edgeCol} strokeWidth={sw} />
        <polygon points={top} fill={cTop}   stroke={edgeCol} strokeWidth={sw} />
        {/* Gear hex */}
        <polygon points={hp.map(p=>`${p[0]},${p[1]}`).join(' ')}
          fill="none" stroke="#00F2FF" strokeWidth="0.65" opacity={tOp} />
        {/* Alternate spokes */}
        {[0,2,4].map(i => (
          <line key={i} x1={ccx} y1={ccy} x2={hp[i][0]} y2={hp[i][1]}
            stroke="#00F2FF" strokeWidth="0.40" opacity={tOp * 0.60} />
        ))}
        {/* Node dots */}
        {hp.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={0.92} fill="#00F2FF" opacity={tOp * 0.90} />
        ))}
        <circle cx={ccx} cy={ccy} r={1.45} fill="#00F2FF" opacity={tOp} />
        {/* Right face — rack teeth (correct isometric interpolation) */}
        {[0.25, 0.50, 0.75].map((f, i) => (
          <line key={i}
            x1={tx+rr} y1={ty+S*0.5 + Hc*f}
            x2={tx}    y2={ty+S     + Hc*f}
            stroke="#00B8D8" strokeWidth="0.70" opacity="0.30" />
        ))}
        {/* Left face — flow channels */}
        {[0.33, 0.67].map((f, i) => (
          <line key={i}
            x1={tx - rr*(1-f)} y1={ty+S*0.5 + S*0.5*f}
            x2={tx - rr*(1-f)} y2={ty+S*0.5 + S*0.5*f + Hc}
            stroke="#00A0CC" strokeWidth="0.50" opacity="0.22" />
        ))}
        {/* Neon top-edge highlights */}
        <line x1={tx} y1={ty} x2={tx+rr} y2={ty+S*0.5}
          stroke="#00F2FF" strokeWidth="1.15" opacity="0.88" />
        <line x1={tx} y1={ty} x2={tx-rr} y2={ty+S*0.5}
          stroke="#3AF0FF" strokeWidth="0.70" opacity="0.55" />
        {/* Vertical front-right edge neon */}
        <line x1={tx+rr} y1={ty+S*0.5} x2={tx+rr} y2={ty+S*0.5+Hc}
          stroke="#00D8F8" strokeWidth="0.80" opacity="0.60" />
      </g>
    );
  };

  // ── Per-round portal scene placeholder ──────────────────────────────────────
  const cfg = SCENE_CONFIGS[round] ?? SCENE_CONFIGS[0];

  const renderPortalScene = (
    px: number, py: number,
    colors: [string, string],
    isLit: boolean,
    sides: number,
  ) => {
    const [fill, accent] = colors;
    const rS = H * 0.072;
    // Regular polygon vertices, centred above the portal
    const pts = Array.from({ length: sides }, (_, i) => {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      return `${px + Math.cos(a) * rS * 0.80},${py - H * 0.145 + Math.sin(a) * rS}`;
    }).join(' ');
    return (
      <>
        {/* Soft ambient halo */}
        <ellipse cx={px} cy={py - H*0.145} rx={W*0.13} ry={H*0.11}
          fill={fill} opacity="0.18" filter="url(#soft-blur)" />
        {/* Placeholder polygon shape */}
        <polygon points={pts}
          fill={fill} opacity="0.50" stroke={accent} strokeWidth="1.4" />
        {/* Inner highlight dot */}
        <circle cx={px} cy={py - H*0.145} r={W*0.018}
          fill={accent} opacity="0.70" filter="url(#faint-blur)" />
        {/* Portal glow */}
        <circle cx={px} cy={py} r={W*0.09} fill={fill}
          opacity={isLit ? 0.55 : 0.22}
          filter="url(#soft-blur)"
          style={{ transition: 'opacity 0.4s' }} />
      </>
    );
  };

  // ── Chaos — Irregular Stepping-Stone Walkway ────────────────────────────────
  const renderChaosWalkway = (w: ReturnType<typeof buildPath>, glow: boolean) => {
    const numStones = 9;
    const stones = Array.from({ length: numStones }, (_, i) => {
      const t     = (i + 1) / (numStones + 1);
      const jitter  = Math.sin(i * 2.7 + 1.3) * 0.018;
      const sizeVar = 0.78 + Math.abs(Math.sin(i * 1.9)) * 0.44;
      const hwT     = (w.hw_near * (1 - t) + w.hw_far * t) * sizeVar;
      const halfLen = (6 - t * 3.5) * 0.55;
      const depth   = w.dep_near * (1 - t) + w.dep_far * t;
      const mx = cx + w.dx * t + w.perpX * jitter * W;
      const my = cy + w.dy * t + w.perpY * jitter * H;

      const sA = { x: mx + w.perpX*hwT - w.dirX*halfLen, y: my + w.perpY*hwT - w.dirY*halfLen };
      const sB = { x: mx - w.perpX*hwT - w.dirX*halfLen, y: my - w.perpY*hwT - w.dirY*halfLen };
      const sC = { x: mx - w.perpX*hwT + w.dirX*halfLen, y: my - w.perpY*hwT + w.dirY*halfLen };
      const sD = { x: mx + w.perpX*hwT + w.dirX*halfLen, y: my + w.perpY*hwT + w.dirY*halfLen };

      const topPts    = [sA, sB, sC, sD].map(p => `${p.x},${p.y}`).join(' ');
      const shadowPts = [sA, sB, sC, sD].map(p => `${p.x},${p.y+5}`).join(' ');
      const nearEdge  = (sA.y + sD.y >= sB.y + sC.y) ? [sA, sD] : [sB, sC];
      const sidePts   = `${nearEdge[0].x},${nearEdge[0].y} ${nearEdge[1].x},${nearEdge[1].y} ` +
                        `${nearEdge[1].x},${nearEdge[1].y+depth*0.9} ${nearEdge[0].x},${nearEdge[0].y+depth}`;
      const topColor  = i % 3 === 0 ? '#C4B898' : i % 3 === 1 ? '#B8AC88' : '#CABB98';
      const sideColor = i % 3 === 0 ? '#8A7860' : i % 3 === 1 ? '#7A6850' : '#948070';

      return (
        <g key={i}>
          <polygon points={shadowPts} fill="rgba(0,0,0,0.15)" />
          <polygon points={sidePts}   fill={sideColor} opacity="0.78" />
          <polygon points={topPts}    fill={topColor}  opacity={0.86 - t * 0.14} />
          <polygon points={topPts}    fill="none" stroke="#D8C898" strokeWidth="0.8" opacity={0.55 - t * 0.30} />
        </g>
      );
    });
    return (
      <>
        <line x1={w.A.x} y1={w.A.y} x2={w.D.x} y2={w.D.y}
          stroke="rgba(160,130,80,0.18)" strokeWidth="1" strokeDasharray="5,8" />
        <line x1={w.B.x} y1={w.B.y} x2={w.C.x} y2={w.C.y}
          stroke="rgba(160,130,80,0.18)" strokeWidth="1" strokeDasharray="5,8" />
        {stones}
        <line x1={w.nearPts[0].x} y1={w.nearPts[0].y}
              x2={w.nearPts[1].x} y2={w.nearPts[1].y}
          stroke="#C8B878" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        {glow && (
          <polygon points={[w.A,w.B,w.C,w.D].map(p=>`${p.x},${p.y}`).join(' ')}
            fill="rgba(200,180,100,0.10)" />
        )}
      </>
    );
  };

  // ── Precision — Stone-bridge Walkway (Monument Valley style) ────────────────
  const renderPrecisionWalkway = (w: ReturnType<typeof buildPath>, glow: boolean) => {
    const pts = (offset = 0) =>
      [w.A, w.B, w.C, w.D].map(p => `${p.x},${p.y + offset}`).join(' ');
    const [n0, n1] = w.nearPts;
    const [f0, f1] = w.farPts;
    const sidePts = [
      `${n0.x},${n0.y}`, `${n1.x},${n1.y}`,
      `${n1.x},${n1.y + w.dep_far}`, `${n0.x},${n0.y + w.dep_near}`,
    ].join(' ');

    return (
      <>
        {/* Shadow drop */}
        <polygon points={pts(8)} fill="rgba(0,0,0,0.28)" />
        {/* Side face — purple-blue glass */}
        <polygon points={sidePts} fill="rgba(65,80,165,0.80)" />
        {/* Surface — glassy cyan */}
        <polygon points={pts()} fill="url(#path-grad-R)" />

        {/* Glass grid — faint isometric cross-lines */}
        {w.tiles.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="rgba(175,210,255,0.28)" strokeWidth="0.65" />
        ))}

        {/* Particle streams flowing toward portal */}
        {([-0.55, -0.25, 0, 0.25, 0.55] as number[]).map((frac, si) => {
          const x1 = cx + w.perpX * (w.hw_near * frac);
          const y1 = cy + w.perpY * (w.hw_near * frac);
          const x2 = rx + w.perpX * (w.hw_far * frac * 0.35);
          const y2 = ry + w.perpY * (w.hw_far * frac * 0.35);
          const af = Math.abs(frac);
          return (
            <line key={si} x1={x2} y1={y2} x2={x1} y2={y1}
              stroke="rgba(185,215,255,0.85)"
              strokeWidth={1.6 - af * 0.65}
              strokeDasharray={`${4.5 - af},${12 + si * 2.5}`}
              strokeDashoffset={si * 11}
              filter="url(#neon-line)"
              opacity={0.78 - af * 0.22} />
          );
        })}

        {/* Far (portal) edge */}
        <line x1={f0.x} y1={f0.y} x2={f1.x} y2={f1.y}
          stroke="rgba(195,175,255,0.48)" strokeWidth="1" strokeLinecap="round" />
        {/* Near (character) edge — neon */}
        <line x1={n0.x} y1={n0.y} x2={n1.x} y2={n1.y}
          stroke="rgba(215,230,255,0.94)" strokeWidth="2.2" strokeLinecap="round" />
        {/* Side-face bottom edge */}
        <line x1={n0.x} y1={n0.y + w.dep_near} x2={n1.x} y2={n1.y + w.dep_far}
          stroke="rgba(0,0,0,0.38)" strokeWidth="1.0" opacity="0.55" />

        {glow && <polygon points={pts()} fill="rgba(160,150,255,0.16)" />}
      </>
    );
  };

  const S            = W * 0.065;
  const chaosOpacity = litSide === 'right' ? 0.45 : 1;
  const precOpacity  = litSide === 'left'  ? 0.45 : 1;

  return (
    <svg className="absolute inset-0"
      width={W} height={H}
      viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="path-grad-L"
          x1={lx} y1={ly} x2={cx} y2={cy} gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#907850" />
          <stop offset="100%" stopColor="#D0B870" />
        </linearGradient>
        <linearGradient id="prec-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#12152A" />
          <stop offset="100%" stopColor="#090C18" />
        </linearGradient>
        <linearGradient id="path-grad-R"
          x1={rx} y1={ry} x2={cx} y2={cy} gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#88C4F8" stopOpacity="0.78" />
          <stop offset="100%" stopColor="#C8EAFF" stopOpacity="0.92" />
        </linearGradient>
        <radialGradient id="char-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#C8C0FF" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#C8C0FF" stopOpacity="0" />
        </radialGradient>
        <filter id="soft-blur"><feGaussianBlur stdDeviation="18" /></filter>
        <filter id="neon-glow"><feGaussianBlur stdDeviation="8"  /></filter>
        <filter id="neon-line"><feGaussianBlur stdDeviation="2"  /></filter>
        <filter id="faint-blur"><feGaussianBlur stdDeviation="5" /></filter>
      </defs>

      <rect fill="#0D0F1A" width={W} height={H} />

      {/* ════ LEFT — CHAOS / INTUITION ════ */}
      <g style={{ transition: 'opacity 0.5s ease', opacity: chaosOpacity }}>

        {round === 0 ? (
          <>
            {/* Round 0 — Low-poly Natural Landscape */}
            <ellipse cx={lx - W*0.04} cy={ly - H*0.02} rx={W*0.44} ry={H*0.30}
              fill="#C8A040" opacity="0.15" filter="url(#soft-blur)" />
            <ellipse cx={lx + W*0.01} cy={ly - H*0.24} rx={W*0.14} ry={H*0.11}
              fill="#DDD0A0" opacity="0.26" filter="url(#faint-blur)" />
            <polygon points={`${lx-W*0.120},${ly-H*0.065} ${lx-W*0.052},${ly-H*0.178} ${lx+W*0.018},${ly-H*0.132} ${lx+W*0.082},${ly-H*0.162} ${lx+W*0.142},${ly-H*0.080} ${lx+W*0.158},${ly-H*0.022} ${lx-W*0.138},${ly-H*0.022}`}
              fill="#B8AA88" opacity="0.52" />
            <polygon points={`${lx+W*0.005},${ly-H*0.308} ${lx-W*0.088},${ly-H*0.078} ${lx-W*0.045},${ly-H*0.200}`}
              fill="#9C8870" opacity="0.84" />
            <polygon points={`${lx+W*0.005},${ly-H*0.308} ${lx-W*0.045},${ly-H*0.200} ${lx+W*0.055},${ly-H*0.195}`}
              fill="#C8B090" opacity="0.90" />
            <polygon points={`${lx+W*0.005},${ly-H*0.308} ${lx-W*0.088},${ly-H*0.078} ${lx-W*0.022},${ly-H*0.088}`}
              fill="#A89068" opacity="0.92" />
            <polygon points={`${lx+W*0.005},${ly-H*0.308} ${lx-W*0.022},${ly-H*0.088} ${lx+W*0.092},${ly-H*0.068}`}
              fill="#D4BE96" opacity="0.94" />
            <polygon points={`${lx+W*0.005},${ly-H*0.308} ${lx+W*0.092},${ly-H*0.068} ${lx+W*0.115},${ly-H*0.038}`}
              fill="#CAB080" opacity="0.88" />
            <polygon points={`${lx-W*0.022},${ly-H*0.088} ${lx-W*0.088},${ly-H*0.078} ${lx-W*0.060},${ly-H*0.040}`}
              fill="#988060" opacity="0.78" />
            <polygon points={`${lx-W*0.152},${ly-H*0.025} ${lx-W*0.080},${ly-H*0.080} ${lx-W*0.020},${ly-H*0.058} ${lx+W*0.018},${ly-H*0.025}`}
              fill="#C2AA70" opacity="0.88" />
            <polygon points={`${lx+W*0.055},${ly-H*0.025} ${lx+W*0.092},${ly-H*0.060} ${lx+W*0.148},${ly-H*0.042} ${lx+W*0.165},${ly-H*0.025}`}
              fill="#C8B468" opacity="0.88" />
            <polygon points={`${lx-W*0.158},${ly-H*0.028} ${lx-W*0.080},${ly-H*0.058} ${lx+W*0.018},${ly-H*0.048} ${lx+W*0.055},${ly-H*0.030} ${lx+W*0.092},${ly-H*0.052} ${lx+W*0.162},${ly-H*0.028} ${lx+W*0.165},${ly} ${lx-W*0.160},${ly}`}
              fill="#D4C070" opacity="0.80" />
            <polygon points={`${lx-W*0.160},${ly} ${lx+W*0.165},${ly} ${lx+W*0.165},${ly+H*0.050} ${lx-W*0.160},${ly+H*0.050}`}
              fill="#D0BC62" opacity="0.75" />
            <polygon points={`${lx-W*0.148},${ly-H*0.025} ${lx-W*0.105},${ly-H*0.058} ${lx-W*0.105},${ly-H*0.010} ${lx-W*0.148},${ly}`}
              fill="#9A8858" opacity="0.68" />
            {/* Fir tree 1 */}
            <polygon points={`${lx+W*0.008},${ly-H*0.092} ${lx-W*0.022},${ly-H*0.030} ${lx+W*0.008},${ly-H*0.030}`} fill="#3A5826" opacity="0.88" />
            <polygon points={`${lx+W*0.008},${ly-H*0.092} ${lx+W*0.008},${ly-H*0.030} ${lx+W*0.038},${ly-H*0.030}`} fill="#507838" opacity="0.88" />
            <polygon points={`${lx+W*0.008},${ly-H*0.126} ${lx-W*0.012},${ly-H*0.078} ${lx+W*0.008},${ly-H*0.078}`} fill="#3A5826" opacity="0.85" />
            <polygon points={`${lx+W*0.008},${ly-H*0.126} ${lx+W*0.008},${ly-H*0.078} ${lx+W*0.028},${ly-H*0.078}`} fill="#507838" opacity="0.85" />
            <polygon points={`${lx+W*0.008},${ly-H*0.152} ${lx-W*0.004},${ly-H*0.118} ${lx+W*0.008},${ly-H*0.118}`} fill="#3A5826" opacity="0.82" />
            <polygon points={`${lx+W*0.008},${ly-H*0.152} ${lx+W*0.008},${ly-H*0.118} ${lx+W*0.020},${ly-H*0.118}`} fill="#507838" opacity="0.82" />
            {/* Fir tree 2 */}
            <polygon points={`${lx-W*0.022},${ly-H*0.066} ${lx-W*0.042},${ly-H*0.030} ${lx-W*0.022},${ly-H*0.030}`} fill="#3A5826" opacity="0.84" />
            <polygon points={`${lx-W*0.022},${ly-H*0.066} ${lx-W*0.022},${ly-H*0.030} ${lx-W*0.002},${ly-H*0.030}`} fill="#507838" opacity="0.84" />
            <polygon points={`${lx-W*0.022},${ly-H*0.090} ${lx-W*0.035},${ly-H*0.058} ${lx-W*0.022},${ly-H*0.058}`} fill="#3A5826" opacity="0.81" />
            <polygon points={`${lx-W*0.022},${ly-H*0.090} ${lx-W*0.022},${ly-H*0.058} ${lx-W*0.009},${ly-H*0.058}`} fill="#507838" opacity="0.81" />
            <polygon points={`${lx-W*0.022},${ly-H*0.108} ${lx-W*0.030},${ly-H*0.084} ${lx-W*0.022},${ly-H*0.084}`} fill="#3A5826" opacity="0.78" />
            <polygon points={`${lx-W*0.022},${ly-H*0.108} ${lx-W*0.022},${ly-H*0.084} ${lx-W*0.014},${ly-H*0.084}`} fill="#507838" opacity="0.78" />
            {/* Round trees */}
            <ellipse cx={lx+W*0.098} cy={ly-H*0.044} rx={W*0.036} ry={H*0.044} fill="#7A8A3C" opacity="0.88" />
            <path d={`M ${lx+W*0.098} ${ly-H*0.088} A ${W*0.036} ${H*0.044} 0 0 1 ${lx+W*0.134} ${ly-H*0.044} A ${W*0.036} ${H*0.044} 0 0 1 ${lx+W*0.098} ${ly} Z`} fill="#9AAE50" opacity="0.88" />
            <ellipse cx={lx+W*0.098} cy={ly} rx={W*0.020} ry={H*0.008} fill="rgba(0,0,0,0.16)" />
            <ellipse cx={lx+W*0.155} cy={ly-H*0.028} rx={W*0.024} ry={H*0.028} fill="#7A8A3C" opacity="0.84" />
            <path d={`M ${lx+W*0.155} ${ly-H*0.056} A ${W*0.024} ${H*0.028} 0 0 1 ${lx+W*0.179} ${ly-H*0.028} A ${W*0.024} ${H*0.028} 0 0 1 ${lx+W*0.155} ${ly} Z`} fill="#9AAE50" opacity="0.84" />
            {/* Boulders */}
            <polygon points={`${lx-W*0.058},${ly-H*0.022} ${lx-W*0.042},${ly-H*0.042} ${lx-W*0.024},${ly-H*0.040} ${lx-W*0.020},${ly-H*0.022} ${lx-W*0.038},${ly-H*0.012}`} fill="#B8B0A0" opacity="0.88" />
            <polygon points={`${lx-W*0.058},${ly-H*0.022} ${lx-W*0.042},${ly-H*0.042} ${lx-W*0.054},${ly-H*0.036}`} fill="#9A9088" opacity="0.82" />
            <polygon points={`${lx+W*0.060},${ly-H*0.014} ${lx+W*0.068},${ly-H*0.026} ${lx+W*0.080},${ly-H*0.024} ${lx+W*0.082},${ly-H*0.012}`} fill="#C0B8A8" opacity="0.84" />
            {/* Portal glow */}
            <circle cx={lx} cy={ly} r={W*0.10} fill="#C8A850"
              opacity={litSide === 'left' ? 0.55 : 0.25}
              filter="url(#soft-blur)" style={{ transition: 'opacity 0.4s' }} />
          </>
        ) : round === 1 ? (
          <>
            {/* Round 1 — Ice Crystal Tower */}

            {/* Left-half pixel stars */}
            {([
              [W*0.03, H*0.042], [W*0.19, H*0.065], [W*0.29, H*0.035],
              [W*0.08, H*0.158], [W*0.25, H*0.190], [W*0.05, H*0.332],
              [W*0.21, H*0.348], [W*0.11, H*0.485], [W*0.30, H*0.508],
              [W*0.16, H*0.628], [W*0.06, H*0.694], [W*0.28, H*0.742],
            ] as [number, number][]).map(([sx, sy], i) => (
              <rect key={i} x={sx} y={sy}
                width={i % 3 === 0 ? 2.2 : 1.4} height={i % 3 === 0 ? 2.2 : 1.4}
                fill={i % 4 === 0 ? '#C8E0FF' : '#FFFFFF'} opacity={0.48 + (i % 3) * 0.14} />
            ))}

            {/* Ambient ice glow */}
            <ellipse cx={lx} cy={ly - H*0.08} rx={W*0.22} ry={H*0.18}
              fill="#7099CC" opacity="0.16" filter="url(#soft-blur)" />

            {/* Tower + platform */}
            {(() => {
              const S_b  = S * 0.78;  const rr_b = S_b * 0.866;
              const S2   = S * 0.62;
              const S3   = S * 0.48;
              const Scl  = S * 0.36;  const Scp  = S * 0.26;
              const Splt = S * 1.55;
              const cT = '#E8F4FF'; const cL = '#5878A8';
              const cR = '#90AACE'; const cE = 'rgba(190,225,255,0.65)';
              const sw = 0.72;
              const ty_plat = ly - H * 0.030;
              const ty_base = ly - H * 0.012;
              const ty2     = ly - H * 0.072;
              const ty3     = ly - H * 0.122;
              const ty_col  = ly - H * 0.148;
              const ty_cap  = ly - H * 0.172;
              const orbY    = ty_cap - H * 0.020;
              return (
                <>
                  {/* Ground platform */}
                  {isoCube(lx, ty_plat, Splt, H*0.012, '#D0E8F8', '#8099B8', '#B0C8DC', 'rgba(180,220,255,0.38)', 0.52)}

                  {/* Crystal shards */}
                  <polygon points={`${lx-W*0.125},${ly+H*0.002} ${lx-W*0.100},${ly-H*0.028} ${lx-W*0.082},${ly+H*0.002}`}
                    fill="#C0D8EE" opacity="0.75" stroke="rgba(200,230,255,0.48)" strokeWidth="0.5" />
                  <polygon points={`${lx+W*0.095},${ly+H*0.002} ${lx+W*0.115},${ly-H*0.020} ${lx+W*0.132},${ly+H*0.002}`}
                    fill="#D0E6F8" opacity="0.68" stroke="rgba(200,230,255,0.40)" strokeWidth="0.5" />
                  <polygon points={`${lx-W*0.060},${ly+H*0.008} ${lx-W*0.046},${ly-H*0.018} ${lx-W*0.030},${ly+H*0.008}`}
                    fill="#B8D2EA" opacity="0.62" stroke="rgba(180,210,245,0.36)" strokeWidth="0.4" />
                  <polygon points={`${lx+W*0.058},${ly+H*0.006} ${lx+W*0.072},${ly-H*0.014} ${lx+W*0.088},${ly+H*0.006}`}
                    fill="#C8DCEE" opacity="0.60" stroke="rgba(190,220,250,0.34)" strokeWidth="0.4" />

                  {/* BASE CLUSTER — back pair first (far), center-front last (near) */}
                  {isoCube(lx - rr_b * 1.55, ty_base, S_b, H*0.050, cT, cL, cR, cE, sw)}
                  {isoCube(lx + rr_b * 1.55, ty_base, S_b, H*0.050, cT, cL, cR, cE, sw)}
                  {isoCube(lx, ty_base + S_b * 0.44, S_b, H*0.050, cT, cL, cR, cE, sw)}

                  {/* LEVEL 2 */}
                  {isoCube(lx - S2*0.866*0.92, ty2, S2, H*0.042, cT, cL, cR, cE, sw)}
                  {isoCube(lx + S2*0.866*0.92, ty2, S2, H*0.042, cT, cL, cR, cE, sw)}

                  {/* LEVEL 3 */}
                  {isoCube(lx - S3*0.866*0.70, ty3, S3, H*0.036, cT, cL, cR, cE, sw)}
                  {isoCube(lx + S3*0.866*0.70, ty3, S3, H*0.036, cT, cL, cR, cE, sw)}

                  {/* COLUMN */}
                  {isoCube(lx, ty_col, Scl, H*0.060, cT, cL, cR, cE, sw)}

                  {/* CAP */}
                  {isoCube(lx, ty_cap, Scp, H*0.022, cT, cL, cR, cE, sw)}

                  {/* Orb glow at apex */}
                  <circle cx={lx} cy={orbY} r={W*0.065}
                    fill="none" stroke="rgba(220,240,255,0.50)"
                    strokeWidth={W*0.040} filter="url(#soft-blur)" />
                  <circle cx={lx} cy={orbY} r={W*0.028}
                    fill="rgba(240,250,255,0.88)" filter="url(#neon-glow)" />
                  <circle cx={lx} cy={orbY} r={W*0.016}
                    fill="#FFFFFF" opacity="0.95" />
                </>
              );
            })()}

            {/* Portal glow — icy blue */}
            <circle cx={lx} cy={ly} r={W*0.10} fill="#A8C8E8"
              opacity={litSide === 'left' ? 0.55 : 0.25}
              filter="url(#soft-blur)" style={{ transition: 'opacity 0.4s' }} />
          </>
        ) : (
          renderPortalScene(lx, ly, cfg.left.colors, litSide === 'left', cfg.left.sides)
        )}
      </g>

      {/* ════ RIGHT — PRECISION / ORDER  (Monument Valley style) ════ */}
      <g style={{ transition: 'opacity 0.5s ease', opacity: precOpacity }}>
        {/* Deep space background panel */}
        <polygon points={`${W*0.38},0 ${W},0 ${W},${H} ${W*0.32},${H*0.72}`}
          fill="url(#prec-bg)" opacity="0.92" />

        {/* Pixel star squares — scattered deep-field */}
        {([
          [W*0.60, H*0.050], [W*0.74, H*0.082], [W*0.91, H*0.060],
          [W*0.67, H*0.175], [W*0.96, H*0.145], [W*0.57, H*0.310],
          [W*0.83, H*0.388], [W*0.71, H*0.525], [W*0.94, H*0.468],
          [W*0.63, H*0.642], [W*0.78, H*0.718], [W*0.90, H*0.805],
        ] as [number,number][]).map(([sx, sy], i) => (
          <rect key={i} x={sx - 2.5} y={sy - 2.5} width={5} height={5}
            fill={i % 3 === 0 ? '#8CC8F5' : i % 3 === 1 ? '#A8B8FF' : '#C0AAFF'}
            opacity={0.35 + (i % 3) * 0.10}
            filter="url(#neon-line)" />
        ))}

        {round === 0 ? (
          <>
            {/* Round 0 — Glass Cube Cluster */}
            <ellipse cx={rx - W*0.005} cy={ry - H*0.158} rx={W*0.24} ry={H*0.19}
              fill="#B090E8" opacity="0.32" filter="url(#soft-blur)" />
            <ellipse cx={rx} cy={ry - H*0.080} rx={W*0.16} ry={H*0.12}
              fill="#7090D8" opacity="0.22" filter="url(#soft-blur)" />
            {(() => {
              const cT  = 'rgba(195,215,248,0.88)'; const cL  = 'rgba(85,108,172,0.92)';
              const cR  = 'rgba(128,160,212,0.92)'; const cE  = 'rgba(168,148,255,0.78)';
              const cPT = 'rgba(232,178,244,0.86)'; const cPL = 'rgba(158,95,175,0.90)';
              const cPR = 'rgba(196,130,212,0.90)'; const cPE = 'rgba(228,158,255,0.82)';
              const sw  = 0.88;
              return (
                <>
                  {isoCube(rx - W*0.048, ry - H*0.215, S*0.65, H*0.060, cT,  cL,  cR,  cE,  sw)}
                  {isoCube(rx + W*0.006, ry - H*0.198, S*0.72, H*0.065, cPT, cPL, cPR, cPE, sw)}
                  {isoCube(rx - W*0.082, ry - H*0.182, S*0.60, H*0.050, cT,  cL,  cR,  cE,  sw)}
                  {isoCube(rx + W*0.060, ry - H*0.172, S*0.62, H*0.054, cT,  cL,  cR,  cE,  sw)}
                  <circle cx={rx + W*0.060} cy={ry - H*0.148} r={H*0.042}
                    fill="rgba(100,88,195,0.12)" stroke="rgba(162,142,255,0.65)" strokeWidth="0.85" />
                  <ellipse cx={rx + W*0.060} cy={ry - H*0.148} rx={H*0.042} ry={H*0.016}
                    fill="none" stroke="rgba(162,142,255,0.38)" strokeWidth="0.62" />
                  <ellipse cx={rx + W*0.060} cy={ry - H*0.148} rx={H*0.025} ry={H*0.042}
                    fill="none" stroke="rgba(162,142,255,0.30)" strokeWidth="0.55" />
                  {isoCube(rx - W*0.038, ry - H*0.155, S*0.80, H*0.070, cT,  cL,  cR,  cE,  sw)}
                  {isoCube(rx + W*0.048, ry - H*0.122, S*0.52, H*0.042, cT,  cL,  cR,  cE,  0.80)}
                  {isoCube(rx + W*0.110, ry - H*0.095, S*0.44, H*0.034, cT,  cL,  cR,  cE,  0.74)}
                  {isoCube(rx - W*0.008, ry - H*0.082, S*1.75, H*0.020, cT,  cL,  cR,  cE,  0.76)}
                  <ellipse cx={rx - W*0.008} cy={ry - H*0.082 + S*1.75 + H*0.020 + H*0.008}
                    rx={S*1.75 * 0.866 * 0.80} ry={H*0.012}
                    fill="rgba(0,0,0,0.28)" filter="url(#faint-blur)" />
                </>
              );
            })()}
            {(() => {
              const gx = rx + W*0.092, gy = ry - H*0.272;
              const gs = S * 1.18, gHc = H*0.095, rg = gs * 0.866;
              const gE = 'rgba(158,138,255,0.68)';
              const top = `${gx},${gy} ${gx+rg},${gy+gs*0.5} ${gx},${gy+gs} ${gx-rg},${gy+gs*0.5}`;
              const lf  = `${gx-rg},${gy+gs*0.5} ${gx},${gy+gs} ${gx},${gy+gs+gHc} ${gx-rg},${gy+gs*0.5+gHc}`;
              const rf  = `${gx+rg},${gy+gs*0.5} ${gx},${gy+gs} ${gx},${gy+gs+gHc} ${gx+rg},${gy+gs*0.5+gHc}`;
              return (
                <g>
                  <polygon points={rf}  fill="rgba(95,85,185,0.07)" stroke={gE} strokeWidth="0.90" />
                  <polygon points={lf}  fill="rgba(95,85,185,0.04)" stroke={gE} strokeWidth="0.90" />
                  <polygon points={top} fill="rgba(95,85,185,0.10)" stroke={gE} strokeWidth="0.92" />
                  <line x1={gx} y1={gy} x2={gx} y2={gy+gs} stroke={gE} strokeWidth="0.42" opacity="0.40" />
                  <line x1={gx-rg} y1={gy+gs*0.5} x2={gx+rg} y2={gy+gs*0.5} stroke={gE} strokeWidth="0.42" opacity="0.40" />
                </g>
              );
            })()}
            <circle cx={rx} cy={ry} r={W*0.08} fill="#B8A0FF"
              opacity={litSide === 'right' ? 0.52 : 0.20}
              filter="url(#soft-blur)" style={{ transition: 'opacity 0.4s' }} />
          </>
        ) : round === 1 ? (
          <>
            {/* Round 1 right — Warm Isometric Pyramid */}

            {/* Warm sky overlay — covers the dark space bg + stars */}
            <polygon points={`${W*0.36},0 ${W},0 ${W},${H} ${W*0.30},${H*0.72}`}
              fill="#C88040" opacity="0.92" />
            {/* Sky gradient bands */}
            <ellipse cx={rx + W*0.06} cy={H*0.02} rx={W*0.30} ry={H*0.22}
              fill="#ECC068" opacity="0.55" filter="url(#soft-blur)" />
            <ellipse cx={rx + W*0.02} cy={H*0.60} rx={W*0.26} ry={H*0.28}
              fill="#A05828" opacity="0.45" filter="url(#soft-blur)" />

            {/* Sky sparkle dots */}
            {([
              [W*0.60, H*0.048], [W*0.80, H*0.035], [W*0.94, H*0.058],
              [W*0.70, H*0.120], [W*0.92, H*0.100], [W*0.64, H*0.185],
            ] as [number, number][]).map(([sx, sy], i) => (
              <circle key={i} cx={sx} cy={sy} r={i % 2 === 0 ? 2.4 : 1.5}
                fill={i % 2 === 0 ? '#FFE8A0' : '#FFCC60'} opacity={0.68 + (i % 3) * 0.12}
                filter="url(#neon-line)" />
            ))}

            {/* Pyramid + market scene */}
            {(() => {
              const Sc   = S * 0.92;  const rrc = Sc * 0.866;
              const S2   = S * 0.76;
              const S3   = S * 0.58;
              const Splt = S * 1.80;
              const cT  = 'rgba(142,198,125,0.72)';
              const cL  = '#B07030';
              const cR  = '#CC9048';
              const cE  = 'rgba(215,162,70,0.75)';
              const sw  = 0.88;
              const ty_plat = ry - H * 0.085;
              const ty_base = ry - H * 0.068;
              const ty2     = ry - H * 0.125;
              const ty3     = ry - H * 0.168;

              // feet-y for people on platform surface (isometric front face)
              const gy = ry + H * 0.010;
              // feet-y for people on base-cube tops
              const ct1 = ty_base + Sc * 0.42;
              // feet-y for people on level-2 tops
              const ct2 = ty2 + S2 * 0.40;

              // Mini person: cx=centre-x, cy=feet-y, sc=scale, col=robe colour
              const person = (cx: number, cy: number, sc: number, col = '#F2EEE5') => {
                const ph = H * 0.038 * sc;
                const pw = ph * 0.40;
                const hr = ph * 0.13;
                const bTop = cy - ph * 0.50;
                const hy   = cy - ph * 0.62;
                const tip  = cy - ph;
                return (
                  <g>
                    <line x1={cx-pw*0.22} y1={bTop+ph*0.46} x2={cx-pw*0.22} y2={cy}
                      stroke="#2A1808" strokeWidth={pw*0.26} strokeLinecap="round" />
                    <line x1={cx+pw*0.22} y1={bTop+ph*0.46} x2={cx+pw*0.22} y2={cy}
                      stroke="#2A1808" strokeWidth={pw*0.26} strokeLinecap="round" />
                    <polygon points={`${cx-pw*0.18},${bTop} ${cx+pw*0.18},${bTop} ${cx+pw},${cy} ${cx-pw},${cy}`}
                      fill={col} />
                    <ellipse cx={cx} cy={hy} rx={hr*1.10} ry={hr} fill={col} />
                    <polygon points={`${cx},${tip} ${cx-pw*0.54},${hy+hr*0.55} ${cx+pw*0.54},${hy+hr*0.55}`}
                      fill={col} />
                    <ellipse cx={cx} cy={hy+hr*0.55} rx={pw*0.58} ry={hr*0.26} fill="#E6E2D6" />
                  </g>
                );
              };

              return (
                <>
                  {/* Ground platform */}
                  {isoCube(rx, ty_plat, Splt, H*0.014, '#D4A870', '#9C6C2C', '#BF8A44', 'rgba(195,138,55,0.58)', 0.68)}

                  {/* Market stall — left side of platform */}
                  <line x1={rx-W*0.215} y1={gy-H*0.002} x2={rx-W*0.215} y2={gy-H*0.068}
                    stroke="#7A3C12" strokeWidth="2.2" />
                  <line x1={rx-W*0.138} y1={gy-H*0.002} x2={rx-W*0.138} y2={gy-H*0.068}
                    stroke="#7A3C12" strokeWidth="2.2" />
                  <polygon
                    points={`${rx-W*0.240},${gy-H*0.050} ${rx-W*0.112},${gy-H*0.050} ${rx-W*0.120},${gy-H*0.072} ${rx-W*0.232},${gy-H*0.072}`}
                    fill="#C83820" opacity="0.86" />
                  <polygon
                    points={`${rx-W*0.240},${gy-H*0.050} ${rx-W*0.112},${gy-H*0.050} ${rx-W*0.125},${gy-H*0.058}`}
                    fill="#922010" opacity="0.60" />

                  {/* People behind pyramid (rendered before base cubes) */}
                  {person(rx-W*0.215, gy-H*0.002, 0.50)}
                  {person(rx-W*0.100, gy-H*0.004, 0.56)}
                  {person(rx+W*0.195, gy-H*0.002, 0.48)}

                  {/* BASE CLUSTER — back pair first, center-front last */}
                  {isoCube(rx-rrc*1.58, ty_base, Sc, H*0.055, cT, cL, cR, cE, sw)}
                  {isoCube(rx+rrc*1.58, ty_base, Sc, H*0.055, cT, cL, cR, cE, sw)}
                  {isoCube(rx, ty_base+Sc*0.44, Sc, H*0.055, cT, cL, cR, cE, sw)}

                  {/* People on base-cube tops */}
                  {person(rx-rrc*1.35, ct1, 0.44)}
                  {person(rx+rrc*1.20, ct1, 0.42)}

                  {/* LEVEL 2 */}
                  {isoCube(rx-S2*0.866*0.88, ty2, S2, H*0.048, cT, cL, cR, cE, sw)}
                  {isoCube(rx+S2*0.866*0.88, ty2, S2, H*0.048, cT, cL, cR, cE, sw)}

                  {/* People on level-2 cube tops */}
                  {person(rx-S2*0.866*0.72, ct2, 0.38)}
                  {person(rx+S2*0.866*0.60, ct2, 0.36)}

                  {/* LEVEL 3 — single top cube */}
                  {isoCube(rx, ty3, S3, H*0.040, cT, cL, cR, cE, sw)}

                  {/* Central warm glow */}
                  <ellipse cx={rx} cy={ry-H*0.115} rx={W*0.15} ry={H*0.11}
                    fill="#F0B830" opacity="0.38" filter="url(#soft-blur)" />
                  <ellipse cx={rx} cy={ry-H*0.115} rx={W*0.055} ry={H*0.042}
                    fill="#FFE070" opacity="0.55" filter="url(#neon-glow)" />

                  {/* Hanging lanterns */}
                  <line x1={rx-W*0.055} y1={ry-H*0.075} x2={rx-W*0.055} y2={ry-H*0.055}
                    stroke="#7A4010" strokeWidth="0.9" />
                  <ellipse cx={rx-W*0.055} cy={ry-H*0.048} rx={W*0.012} ry={H*0.009}
                    fill="#F09818" opacity="0.90" filter="url(#neon-line)" />
                  <line x1={rx+W*0.085} y1={ry-H*0.082} x2={rx+W*0.085} y2={ry-H*0.060}
                    stroke="#7A4010" strokeWidth="0.9" />
                  <ellipse cx={rx+W*0.085} cy={ry-H*0.053} rx={W*0.011} ry={H*0.008}
                    fill="#F0C028" opacity="0.88" filter="url(#neon-line)" />

                  {/* Front people (over cubes — in foreground) */}
                  {person(rx-W*0.048, gy+H*0.002, 0.72)}
                  {person(rx+W*0.062, gy,          0.68)}
                  {person(rx+W*0.148, gy+H*0.004,  0.62)}

                  {/* Ground sparkle orbs */}
                  {([
                    [rx-W*0.085, gy-H*0.002], [rx+W*0.170, gy+H*0.008],
                    [rx-W*0.170, gy+H*0.005], [rx+W*0.030, gy+H*0.018],
                  ] as [number,number][]).map(([sx,sy],i) => (
                    <circle key={i} cx={sx} cy={sy} r={2.0-i*0.22}
                      fill="#FFE090" opacity={0.62} filter="url(#neon-line)" />
                  ))}
                </>
              );
            })()}

            {/* Portal glow — warm gold */}
            <circle cx={rx} cy={ry} r={W*0.10} fill="#E0A030"
              opacity={litSide === 'right' ? 0.55 : 0.20}
              filter="url(#soft-blur)" style={{ transition: 'opacity 0.4s' }} />
          </>
        ) : (
          renderPortalScene(rx, ry, cfg.right.colors, litSide === 'right', cfg.right.sides)
        )}
      </g>

      {/* ════ V-SHAPED WALKWAYS ════ */}
      {renderChaosWalkway(L, litSide === 'left')}
      {renderPrecisionWalkway(R, litSide === 'right')}

      {/* Character ground light pool */}
      <ellipse cx={cx} cy={cy + H*0.012} rx={W*0.15} ry={H*0.058}
        fill="url(#char-glow)" />
      {/* Character platform */}
      <ellipse cx={cx} cy={cy + H*0.005} rx={W*0.08} ry={H*0.010}
        fill="#C4A060" opacity="0.4" />
      <rect x={cx - W*0.08} y={cy + H*0.003} width={W*0.16} height={H*0.012} rx={4}
        fill="#A88040" opacity="0.35" />
    </svg>
  );
}

// ── Main step ────────────────────────────────────────────────────────────────
export function SwipeStep() {
  const { nextStep, updateFormData } = useOnboardingStore();

  const [round, setRound]           = useState(0);
  const [animating, setAnimating]   = useState(false);
  const [walkFrame, setWalkFrame]   = useState(0);
  const [facingLeft, setFacingLeft] = useState(false);
  const [litSide, setLitSide]       = useState<'left' | 'right' | null>(null);

  // Viewport dimensions — SceneSVG uses these so its coords match CSS & Framer Motion
  const [vw, setVw] = useState(375);
  const [vh, setVh] = useState(812);
  useEffect(() => {
    const update = () => { setVw(window.innerWidth); setVh(window.innerHeight); };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const answers      = useRef<number[]>([]);
  const dragStartX   = useRef<number | null>(null);
  const dragCurrentX = useRef<number>(0);
  const walkInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const controls     = useAnimation();

  const triggerChoice = useCallback(async (direction: 'left' | 'right') => {
    if (animating) return;
    setAnimating(true);
    setFacingLeft(direction === 'left');
    setLitSide(direction);

    let f = 0;
    walkInterval.current = setInterval(() => { f++; setWalkFrame(f); }, 185); // slow walk

    const W = window.innerWidth, H = window.innerHeight;
    // Move character from its CSS position (CHAR%) toward the portal (LEFT/RIGHT%)
    const targetX = direction === 'left'
      ? -W * (CHAR.x - LEFT.x)    // ≈ -0.34W
      :  W * (RIGHT.x - CHAR.x);  // ≈ +0.34W
    const targetY = -H * (CHAR.y - LEFT.y); // ≈ -0.43H (same for both sides)

    await controls.start({
      x: targetX,
      y: targetY,
      scale: 0.22,   // shrinks dramatically — deep perspective receding
      opacity: 0,
      transition: { duration: 1.6, ease: [0.2, 0, 0.6, 1] }, // slow start, faster at end
    });

    clearInterval(walkInterval.current!);
    setLitSide(null);

    const answer = direction === 'left' ? 0 : 1;
    answers.current = [...answers.current, answer];

    if (answers.current.length >= TOTAL_ROUNDS) {
      const traitVector = calculateSoulVector(answers.current);
      updateFormData({ swipeAnswers: answers.current, traitVector });
      nextStep();
    } else {
      controls.start({ x: 0, y: 0, scale: 1, opacity: 1, transition: { duration: 0 } });
      setWalkFrame(0);
      setFacingLeft(false);
      setAnimating(false);
      setRound(r => r + 1);
    }
  }, [animating, controls, nextStep, updateFormData]);

  const goBack = useCallback(() => {
    if (round === 0 || animating) return;
    answers.current = answers.current.slice(0, -1);
    controls.start({ x: 0, y: 0, scale: 1, opacity: 1, transition: { duration: 0 } });
    setWalkFrame(0);
    setFacingLeft(false);
    setLitSide(null);
    setAnimating(false);
    setRound(r => r - 1);
  }, [round, animating, controls]);

  const applyDrag = (deltaX: number) => {
    if (animating) return;
    const W = window.innerWidth, H = window.innerHeight;
    const t = Math.abs(deltaX) / (W * 0.45);
    // Preview along path angle: x moves along path, y follows the path slope
    // Path slope: (CHAR.y - LEFT.y) / (CHAR.x - LEFT.x) ≈ 0.43H / 0.34W
    const slope = (CHAR.y - LEFT.y) * H / ((CHAR.x - LEFT.x) * W);
    // FM v12: controls.set() no longer triggers visual updates; use start() with duration:0
    controls.start({
      x: deltaX * 0.30,
      y: -Math.abs(deltaX * 0.30) * slope,
      scale: 1 - t * 0.08,
      transition: { duration: 0 },
    });
    if (deltaX !== 0) setFacingLeft(deltaX < 0);
    setLitSide(Math.abs(deltaX) > 35 ? (deltaX < 0 ? 'left' : 'right') : null);
  };

  const onDown = (x: number) => {
    if (!animating) { dragStartX.current = x; dragCurrentX.current = 0; }
  };
  const onMove = (x: number) => {
    if (dragStartX.current === null || animating) return;
    const d = x - dragStartX.current;
    dragCurrentX.current = d;
    applyDrag(d);
  };
  const onUp = () => {
    if (dragStartX.current === null || animating) return;
    const d = dragCurrentX.current;
    if (Math.abs(d) >= SWIPE_THRESHOLD) {
      triggerChoice(d < 0 ? 'left' : 'right');
    } else {
      setLitSide(null);
      controls.start({ x: 0, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 26 } });
    }
    dragStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 select-none overflow-hidden"
      style={{ touchAction: 'none' }}
      onMouseDown={e => onDown(e.clientX)}
      onMouseMove={e => onMove(e.clientX)}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onTouchStart={e => onDown(e.touches[0].clientX)}
      onTouchMove={e => onMove(e.touches[0].clientX)}
      onTouchEnd={onUp}
    >
      {/* Full-screen scene — viewW/viewH match CSS viewport so paths align with character */}
      <SceneSVG litSide={litSide} viewW={vw} viewH={vh} round={round} />

      {/* Progress dots */}
      <div className="absolute top-10 left-0 right-0 flex justify-center items-center gap-2 z-20 pointer-events-none">
        {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
          <motion.div key={i} className="rounded-full"
            animate={{
              width:  i === round ? 12 : 8,
              height: i === round ? 12 : 8,
              backgroundColor:
                i < round   ? '#FFD88A' :
                i === round ? '#FFFFFF' :
                              'rgba(255,255,255,0.28)',
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      {/* Back button — undo last answer */}
      <AnimatePresence>
        {round > 0 && !animating && (
          <motion.button
            key="back-btn"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            className="absolute z-30 flex items-center gap-1.5 px-3 py-2 rounded-full"
            style={{
              bottom: '8%',
              left: '6%',
              background: 'rgba(255,255,255,0.10)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: 'rgba(255,255,255,0.60)',
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: '0.08em',
              backdropFilter: 'blur(6px)',
            }}
            onClick={goBack}
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
          >
            <RotateCcw size={12} />
            <span>上一问</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Question overlay — animates on each round change */}
      <AnimatePresence mode="wait">
        <motion.div
          key={round}
          className="absolute left-0 right-0 z-20 pointer-events-none flex flex-col items-center gap-3"
          style={{ top: '11%' }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          {/* Prompt */}
          <p className="text-white/80 text-sm font-light tracking-widest text-center px-8"
            style={{ fontFamily: 'monospace', letterSpacing: '0.12em' }}>
            {QUESTIONS[round].prompt}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Character — positioned at same % as CHAR constants */}
      <div
        className="absolute z-10"
        style={{
          left: `${CHAR.x * 100}%`,
          top:  `${CHAR.y * 100}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Idle float */}
        <motion.div
          animate={animating ? { y: 0 } : { y: [0, -6, 0] }}
          transition={animating
            ? { duration: 0.1 }
            : { repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
        >
          {/* Walk + swipe transform */}
          <motion.div
            animate={controls}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            className="cursor-grab active:cursor-grabbing"
          >
            <IdaFigure frame={walkFrame} facingLeft={facingLeft} />
          </motion.div>
        </motion.div>
      </div>

      {/* Swipe hint — first round only */}
      {!animating && round === 0 && (
        <motion.div
          className="absolute bottom-16 left-0 right-0 flex justify-center pointer-events-none z-20"
          animate={{ x: [-8, 8, -8] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
        >
          <span className="text-white/50 text-sm font-light tracking-widest">← 滑动选择 →</span>
        </motion.div>
      )}
    </div>
  );
}
