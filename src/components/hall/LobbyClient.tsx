"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomParticipants, useRoomState } from '@/hooks/useRoomParticipants';
import { closeRoom, startRoomSession } from '@/lib/room';
import D3Background from '@/components/hall/D3Background';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useSearchParams } from 'next/navigation';
import { ResultPage } from './ResultPage';

export type SessionState = 'waiting' | 'matched' | 'closed';

export default function LobbyClient() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room') || '';
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  
  const { participants, loading } = useRoomParticipants(roomId);
  const { status } = useRoomState(roomId);
  const [isClosing, setIsClosing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

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
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden transition-colors duration-500">
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <D3Background theme={theme} />
      <div className="absolute inset-0 bg-white/40 dark:bg-black/50 z-0 backdrop-blur-sm transition-colors duration-500"></div>

      <div className="relative z-10 container mx-auto px-8 py-12 flex flex-col lg:flex-row min-h-screen gap-12">
        
        {/* Left Section: Connection Info */}
        <div className="flex-1 flex flex-col justify-center items-center lg:items-start lg:ml-12">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/60 dark:bg-black/60 backdrop-blur-xl border border-purple-500/20 dark:border-[#00FF41]/20 p-12 rounded-3xl shadow-[0_0_40px_rgba(147,51,234,0.1)] dark:shadow-[0_0_40px_rgba(0,255,65,0.1)] flex flex-col items-center gap-8 w-full max-w-md transition-colors duration-500"
          >
            <h2 className="text-2xl font-bold tracking-widest text-purple-600 dark:text-[#00FF41] uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-[#00FF41] animate-pulse"></span>
              {t('lobbyActive')}
            </h2>
            <div className="bg-white p-6 rounded-3xl">
              <QRCodeSVG 
                value={joinUrl} 
                size={260} 
                bgColor="#ffffff"
                fgColor="#000000"
                level="Q"
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-gray-600 dark:text-gray-400 font-medium transition-colors">{t('joinSecurely')}</p>
              <p className="text-6xl font-black text-gray-900 dark:text-white tracking-[0.2em] transition-colors">{roomId}</p>
            </div>
          </motion.div>
          
          {/* Host Controls */}
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex gap-4 w-full max-w-md"
          >
            <button 
              onClick={handleStart}
              disabled={isStarting || status === 'matched'}
              className="flex-1 py-4 bg-purple-600 dark:bg-[#00FF41] text-white dark:text-black font-bold text-lg rounded-2xl hover:bg-purple-700 dark:hover:bg-white hover:text-white dark:hover:text-black transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] dark:shadow-[0_0_20px_rgba(0,255,65,0.3)] disabled:opacity-50 flex justify-center items-center"
            >
              {isStarting ? <Loader2 className="w-6 h-6 animate-spin" /> : t('startSession')}
            </button>
            <button 
              onClick={handleClose}
              disabled={isClosing}
              className="px-8 py-4 bg-transparent border-2 border-red-500/50 text-red-500 font-bold text-lg rounded-2xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all disabled:opacity-50"
            >
              {t('killSwitch')}
            </button>
          </motion.div>
        </div>

        {/* Right Section: Real-time Tracker */}
        <div className="flex-1 flex flex-col justify-center pt-12 lg:mr-12">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-10 text-center lg:text-left"
          >
            <h3 className="text-7xl font-black mb-4 tracking-tighter transition-colors">
              <span className="text-purple-600 dark:text-[#00FF41] transition-colors">{participants.length}</span> {t('connected')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-2xl font-light transition-colors">{t('networkReady')}</p>
          </motion.div>

          {/* Participant Grid */}
          <div className="flex-1 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <AnimatePresence>
                {participants.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="bg-white/60 dark:bg-gray-900/50 backdrop-blur-md border border-gray-200 dark:border-gray-800 py-5 px-6 rounded-2xl flex items-center gap-4 hover:border-purple-500/50 dark:hover:border-[#00FF41]/50 transition-colors"
                  >
                     <div className="w-3 h-3 rounded-full bg-purple-500 dark:bg-[#00FF41] shadow-[0_0_10px_purple] dark:shadow-[0_0_10px_#00FF41] animate-pulse"></div>
                     <span className="font-semibold text-lg text-gray-800 dark:text-gray-200 truncate">{p.username || t('anonymous')}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {participants.length === 0 && (
              <div className="h-48 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500/50 italic border-2 border-dashed border-gray-300 dark:border-gray-800/50 rounded-3xl mt-4 transition-colors">
                <p className="text-xl">{t('awaitingConnections')}</p>
              </div>
            )}
          </div>
        </div>

      </div>
      
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
