"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomParticipants, useRoomState } from '@/hooks/useRoomParticipants';
import { closeRoom, startRoomSession } from '@/lib/room';
import NexusMapCanvas from '@/components/hall/NexusMapCanvas';
import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useSearchParams } from 'next/navigation';
import { ResultPage } from './ResultPage';

export type SessionState = 'waiting' | 'matched' | 'closed';

export default function LobbyClient() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || '';
  const router = useRouter();
  const { t } = useTranslation();

  const { participants, loading } = useRoomParticipants(roomId);
  const { status } = useRoomState(roomId);
  const [isClosing, setIsClosing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  // Demo: add fake nodes for visual testing
  const [demoNodes, setDemoNodes] = useState<{ uid: string }[]>([]);
  const demoCounter = useRef(0);
  const addDemoNode = () => {
    setDemoNodes(prev => [...prev, { uid: `demo_${demoCounter.current++}` }]);
  };

  useEffect(() => {
    if (status === 'closed') {
      router.push('/hall');
    }
  }, [status, router]);

  const [origin, setOrigin] = useState('https://icebreaker.app');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const joinUrl = `${origin}/room?room=${roomId}`;

  const handleStart = async () => {
    if (status === 'matched') return;
    setIsStarting(true);
    try {
      await startRoomSession(roomId);
    } catch (err) {
      console.error(err);
      setIsStarting(false);
    }
  };

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await closeRoom(roomId);
    } catch (err) {
      console.error(err);
      setIsClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#00FF41] animate-spin" />
      </div>
    );
  }

  if (status === 'matched') {
    return <ResultPage />;
  }

  return (
    <div className="relative min-h-screen bg-[#0A0E14] text-white overflow-hidden flex">

      {/* Top-right controls */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSwitcher />
      </div>

      {/* ── Left panel: QR + controls ───────────────────────────── */}
      <div className="relative z-10 flex flex-col justify-center items-center gap-8 px-12 py-16 w-[420px] shrink-0">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center gap-6 w-full"
        >
          <h2 className="text-sm font-bold tracking-[0.3em] text-[#00FF41] uppercase flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
            {t('lobbyActive')}
          </h2>

          {/* QR card */}
          <div className="bg-white p-5 rounded-2xl shadow-[0_0_40px_rgba(0,255,65,0.2)]">
            <QRCodeSVG
              value={joinUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#000000"
              level="Q"
            />
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-1">{t('joinSecurely')}</p>
            <p className="text-5xl font-black tracking-[0.25em] text-white">{roomId}</p>
          </div>
        </motion.div>

        {/* Participant count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <span className="text-5xl font-black text-[#00FF41]">{participants.length}</span>
          <span className="text-xl font-light text-gray-400 ml-3">{t('connected')}</span>
        </motion.div>

        {/* Host controls */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col gap-3 w-full"
        >
          <button
            onClick={handleStart}
            disabled={isStarting || status === 'matched'}
            className="w-full py-4 bg-[#00FF41] text-black font-bold text-base rounded-2xl hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,65,0.35)] disabled:opacity-50 flex items-center justify-center"
          >
            {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('startSession')}
          </button>
          <button
            onClick={handleClose}
            disabled={isClosing}
            className="w-full py-3 bg-transparent border border-red-500/50 text-red-400 font-semibold text-sm rounded-2xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all disabled:opacity-50"
          >
            {t('killSwitch')}
          </button>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="w-px bg-white/10 self-stretch my-8" />

      {/* ── Right panel: Nexus Map ───────────────────────────────── */}
      <div className="relative flex-1">
        <NexusMapCanvas
          nodes={[...participants.map(p => ({ uid: p.id, traitVector: p.traitVector })), ...demoNodes]}
          initialNodeCount={60}
        />

        {/* Floating label */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 pointer-events-none select-none text-center">
          <p className="text-xs tracking-[0.25em] text-white/30 uppercase">Soul Resonance Map</p>
        </div>

        {/* Demo: add node button */}
        <button
          onClick={addDemoNode}
          className="absolute bottom-6 right-6 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono tracking-widest transition-all"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.5)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.9)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span>
          NEW NODE
        </button>
      </div>

    </div>
  );
}
