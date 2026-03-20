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
import { useTheme } from '@/hooks/useTheme';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export type SessionState = 'waiting' | 'matched' | 'closed';

export default function LobbyClient() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || '';
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const { participants, loading } = useRoomParticipants(roomId);
  const { status } = useRoomState(roomId);
  const [isClosing, setIsClosing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  // Demo: add fake nodes for visual testing
  const [demoNodes, setDemoNodes] = useState<{ uid: string; traitVector?: number[] }[]>([]);
  const demoCounter = useRef(0);
  const addDemoNode = () => {
    setDemoNodes(prev => [...prev, { 
      uid: `demo_${demoCounter.current++}`,
      traitVector: [Math.random(), Math.random(), Math.random(), Math.random(), Math.random()]
    }]);
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
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden flex transition-colors duration-500">
      
      {/* ── Left panel: QR + controls ───────────────────────────── */}
      <div className="relative z-20 flex flex-col justify-between items-center gap-8 px-10 py-12 w-[400px] shrink-0 bg-white/5 dark:bg-black/20 backdrop-blur-md border-r border-gray-200 dark:border-white/10 transition-colors duration-500">
        
        <div className="w-full space-y-8 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col items-center gap-6 w-full"
          >
            <h2 className="text-xs font-bold tracking-[0.3em] text-purple-600 dark:text-[#00FF41] uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-[#00FF41] animate-pulse" />
              {t('lobbyActive')}
            </h2>

            {/* QR card */}
            <div className="bg-white p-5 rounded-2xl shadow-xl dark:shadow-[0_0_40px_rgba(0,255,65,0.15)] transition-shadow">
              <QRCodeSVG
                value={joinUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="Q"
              />
            </div>

            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-1 uppercase tracking-widest">{t('joinSecurely')}</p>
              <p className="text-4xl font-black tracking-[0.25em] text-gray-900 dark:text-white">{roomId}</p>
            </div>
          </motion.div>

          {/* View Switcher */}
          <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-xl w-full">
            <button 
              onClick={() => setViewMode('graph')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${viewMode === 'graph' ? 'bg-white dark:bg-[#00FF41] text-purple-600 dark:text-black shadow-sm' : 'text-gray-500'}`}
            >
              Network
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#00FF41] text-purple-600 dark:text-black shadow-sm' : 'text-gray-500'}`}
            >
              Participants
            </button>
          </div>

          {/* Participant count */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-center"
          >
            <span className="text-5xl font-black text-purple-600 dark:text-[#00FF41]">{participants.length}</span>
            <span className="text-sm font-bold text-gray-500 dark:text-gray-400 ml-3 uppercase tracking-tighter">{t('connected')}</span>
          </motion.div>
        </div>

        {/* Global Controls & Host controls */}
        <div className="w-full space-y-6">
           {/* Top-right controls */}
          <div className="flex items-center justify-center gap-4">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col gap-3 w-full"
          >
            <button
              onClick={handleStart}
              disabled={isStarting || status === 'matched'}
              className="w-full py-4 bg-purple-600 dark:bg-[#00FF41] text-white dark:text-black font-bold text-base rounded-2xl hover:bg-purple-700 dark:hover:bg-white transition-all shadow-lg dark:shadow-[0_0_20px_rgba(0,255,65,0.2)] disabled:opacity-50 flex items-center justify-center"
            >
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('startSession')}
            </button>
            <button
              onClick={handleClose}
              disabled={isClosing}
              className="w-full py-3 bg-transparent border border-red-500/30 text-red-500 font-semibold text-sm rounded-2xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
            >
              {t('killSwitch')}
            </button>
          </motion.div>
        </div>
      </div>

      {/* ── Right panel: Dynamic Content ───────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'graph' ? (
            <motion.div
              key="graph"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0"
            >
              <NexusMapCanvas
                nodes={[...participants.map(p => ({ uid: p.id, traitVector: p.traitVector })), ...demoNodes]}
                initialNodeCount={60}
                theme={theme}
              />

              {/* Floating labels / buttons for graph mode */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none select-none text-center">
                <p className="text-xs tracking-[0.4em] text-purple-600/40 dark:text-white/30 uppercase font-black">Soul Resonance Map</p>
              </div>

              <button
                onClick={addDemoNode}
                className="absolute bottom-8 right-8 flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold tracking-widest transition-all bg-white/10 dark:bg-white/5 border border-purple-500/20 dark:border-white/10 text-purple-600/60 dark:text-white/40 hover:bg-white/20 dark:hover:bg-white/10 hover:text-purple-600 dark:hover:text-white shadow-xl backdrop-blur-md"
              >
                <span className="text-lg">＋</span>
                NEW NODE
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute inset-0 p-16 overflow-y-auto custom-scrollbar"
            >
              <div className="max-w-4xl mx-auto space-y-12">
                <div className="text-center lg:text-left">
                  <h3 className="text-6xl font-black mb-4 tracking-tighter">
                    <span className="text-purple-600 dark:text-[#00FF41]">{participants.length}</span> {t('connected')}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-xl font-light">{t('networkReady')}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {participants.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-white/5 py-6 px-8 rounded-3xl flex items-center gap-5 hover:border-purple-500/50 dark:hover:border-[#00FF41]/50 transition-all group"
                      >
                         <div className="w-4 h-4 rounded-full bg-purple-500 dark:bg-[#00FF41] shadow-[0_0_15px_rgba(147,51,234,0.5)] dark:shadow-[0_0_15px_rgba(0,255,65,0.5)] animate-pulse" />
                         <span className="font-bold text-xl text-gray-800 dark:text-gray-100 truncate">{p.username || t('anonymous')}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {participants.length === 0 && (
                  <div className="h-64 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 italic border-4 border-dashed border-gray-100 dark:border-white/5 rounded-[40px] transition-colors">
                    <p className="text-2xl font-light">{t('awaitingConnections')}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: ${theme === 'light' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
