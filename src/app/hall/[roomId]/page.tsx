"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomParticipants, useRoomState } from '@/hooks/useRoomParticipants';
import { closeRoom, startRoomSession } from '@/lib/room';
import D3Background from '@/components/hall/D3Background';
import { Loader2 } from 'lucide-react';

export default function HallLobbyPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string; // Wait: in recent Next.js, params is wrapped in a Promise in some contexts, but usually OK as `useParams` for client components
  
  const { participants, loading } = useRoomParticipants(roomId);
  const { status } = useRoomState(roomId);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // If the room is removed the status document might not exist, checking loading
    // We can handle closed room redirects if needed.
  }, [status]);

  const joinUrl = `https://icebreaker.app/join?room=${roomId}`;

  const handleStart = async () => {
    try {
      await startRoomSession(roomId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await closeRoom(roomId);
      router.push('/hall');
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

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">
      <D3Background />
      <div className="absolute inset-0 bg-black/50 z-0 backdrop-blur-sm"></div>

      <div className="relative z-10 container mx-auto px-8 py-12 flex flex-col lg:flex-row min-h-screen gap-12">
        
        {/* Left Section: Connection Info */}
        <div className="flex-1 flex flex-col justify-center items-center lg:items-start lg:ml-12">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-black/60 backdrop-blur-xl border border-[#00FF41]/20 p-12 rounded-3xl shadow-[0_0_40px_rgba(0,255,65,0.1)] flex flex-col items-center gap-8 w-full max-w-md"
          >
            <h2 className="text-2xl font-bold tracking-widest text-[#00FF41] uppercase flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse"></span>
              Lobby Active
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
              <p className="text-gray-400 font-medium">Join securely at icebreaker.app with code:</p>
              <p className="text-6xl font-black text-white tracking-[0.2em]">{roomId}</p>
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
              className="flex-1 py-4 bg-[#00FF41] text-black font-bold text-lg rounded-2xl hover:bg-white hover:text-black transition-all shadow-[0_0_20px_rgba(0,255,65,0.3)]"
            >
              Start Session
            </button>
            <button 
              onClick={handleClose}
              disabled={isClosing}
              className="px-8 py-4 bg-transparent border-2 border-red-500/50 text-red-500 font-bold text-lg rounded-2xl hover:bg-red-500 hover:text-white hover:border-red-500 transition-all disabled:opacity-50"
            >
              Kill Switch
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
            <h3 className="text-7xl font-black mb-4 tracking-tighter">
              <span className="text-[#00FF41]">{participants.length}</span> Connected
            </h3>
            <p className="text-gray-400 text-2xl font-light">Network ready for initialization...</p>
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
                    className="bg-gray-900/50 backdrop-blur-md border border-gray-800 py-5 px-6 rounded-2xl flex items-center gap-4 hover:border-[#00FF41]/50 transition-colors"
                  >
                     <div className="w-3 h-3 rounded-full bg-[#00FF41] shadow-[0_0_10px_#00FF41] animate-pulse"></div>
                     <span className="font-semibold text-lg text-gray-200 truncate">{p.username || 'Anonymous'}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {participants.length === 0 && (
              <div className="h-48 flex flex-col items-center justify-center text-gray-500/50 italic border-2 border-dashed border-gray-800/50 rounded-3xl mt-4">
                <p className="text-xl">Awaiting connections</p>
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
