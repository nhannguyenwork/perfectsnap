import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, RotateCcw, Target, XCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type GameState = 'setup' | 'playing' | 'result';

interface SongInfo {
  title: string;
  artist: string;
  lyrics: string;
  keywordTimestamp: number;
  chorusStartTime: number;
  audioUrl?: string;
  sourceUrl?: string;
}

const PRESETS = [
  {
    id: 'hay-trao-cho-anh',
    title: 'Hãy trao cho anh',
    artist: 'Sơn Tùng M-TP',
    keyword: 'miên man',
    audioUrl: encodeURI('Haytraochoanh (10-11) - Key[Miên man].wav'), // Placeholder audio
    targetStart: 10.0,
    targetEnd: 11.0,
    chorusStartTime: 0,
    lyrics: '...miên man...'
  },
  {
    id: '50-nam-ve-sau',
    title: '50 năm về sau',
    artist: 'Đặng Thanh Tuyền',
    keyword: 'Hoàng hôn',
    audioUrl: encodeURI('50namvesau (10-11) - Key[Hoàng hôn].wav'), // Placeholder audio
    targetStart: 10.0,
    targetEnd: 11,
    chorusStartTime: 0,
    lyrics: '...Hoàng hôn...'
  }
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('setup');
  const [keyword, setKeyword] = useState<string>('');
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
  
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [targetStart, setTargetStart] = useState<number>(0);
  const [targetEnd, setTargetEnd] = useState<number>(0);
  const [viewDuration] = useState<number>(30);
  const [relativeTime, setRelativeTime] = useState<number>(0);
  const [finalTime, setFinalTime] = useState<number>(0);
  const [toast, setToast] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const requestRef = useRef<number>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const selectPreset = (preset: typeof PRESETS[0]) => {
    setSongInfo({
      title: preset.title,
      artist: preset.artist,
      lyrics: preset.lyrics,
      keywordTimestamp: preset.targetStart,
      chorusStartTime: preset.chorusStartTime,
      audioUrl: preset.audioUrl,
      sourceUrl: ''
    });
    setKeyword(preset.keyword);
    setTargetStart(preset.targetStart);
    setTargetEnd(preset.targetEnd);
    setAudioSrc(preset.audioUrl);
    showToast(`Đã chọn bộ đề: ${preset.title}`);
  };

  const onAudioError = () => {
    if (audioSrc) {
      showToast("Không thể tải file âm thanh. Vui lòng kiểm tra lại đường dẫn.");
    }
  };

  const stopGame = useCallback((timeAtStop?: number) => {
    if (audioRef.current && gameState === 'playing') {
      const absoluteStop = timeAtStop ?? audioRef.current.currentTime;
      const relativeStop = absoluteStop - (songInfo?.chorusStartTime || 0);
      audioRef.current.pause();
      setFinalTime(relativeStop);
      setRelativeTime(relativeStop);
      setGameState('result');
    }
  }, [songInfo, gameState]);

  const updateUI = useCallback(() => {
    if (audioRef.current && gameState === 'playing') {
      const rel = audioRef.current.currentTime - (songInfo?.chorusStartTime || 0);
      setRelativeTime(rel);
      
      if (audioRef.current.ended || rel >= viewDuration) {
        stopGame(audioRef.current.currentTime);
      } else {
        requestRef.current = requestAnimationFrame(updateUI);
      }
    }
  }, [gameState, stopGame, songInfo, viewDuration]);

  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(updateUI);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, updateUI]);

  const startGame = () => {
    if (!audioSrc || !songInfo) {
      showToast("Vui lòng chọn bộ đề trước!");
      return;
    }

    setGameState('playing');
    setRelativeTime(0);
    
    if (audioRef.current) {
      audioRef.current.currentTime = songInfo.chorusStartTime;
      audioRef.current.play().catch(err => {
        console.error("Audio play failed:", err);
        showToast("Không thể phát nhạc. Vui lòng thử lại.");
        setGameState('setup');
      });
    }
  };

  const resetGame = () => {
    setGameState('setup');
    setRelativeTime(0);
    setFinalTime(0);
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
          stopGame();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, stopGame]);

  const isSuccess = finalTime >= targetStart && finalTime <= targetEnd;
  const displayMax = viewDuration;
  const progressPercent = Math.min((relativeTime / displayMax) * 100, 100);
  const targetStartPct = (targetStart / displayMax) * 100;
  const targetEndPct = (targetEnd / displayMax) * 100;
  const targetWidthPct = targetEndPct - targetStartPct;

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-500 ${
      gameState === 'result' ? (isSuccess ? 'bg-green-50' : 'bg-red-50') : 'bg-slate-50'
    }`}>
      {/* Styles for Timeline */}
      <style>{`
        .timeline-wrapper {
          position: relative;
          width: 100%;
          height: 80px;
          display: flex;
          align-items: center;
          background: #f8f8f8;
          border-radius: 16px;
          padding: 0 40px;
        }
        .main-track {
          position: relative;
          width: 100%;
          height: 4px;
          background-color: #e0e0e0;
        }
        .target-zone {
          position: absolute;
          height: 20px;
          top: -8px;
          background-color: #ff0000;
          border-radius: 4px;
          z-index: 5;
        }
        .seeker-line {
          position: absolute;
          width: 4px;
          height: 40px;
          top: -18px;
          background-color: #000000;
          z-index: 10;
          border-radius: 2px;
        }
        .mono-font {
          font-family: 'JetBrains Mono', monospace;
        }
      `}</style>

      <div id="game-container" className={`max-w-3xl w-full bg-white border-4 rounded-[2.5rem] shadow-2xl overflow-hidden p-8 md:p-12 transition-all duration-300 ${
        gameState === 'result' 
          ? (isSuccess ? 'border-green-500 shadow-green-100' : 'border-red-500 shadow-red-100') 
          : 'border-black shadow-slate-200'
      }`}>
        
        <AnimatePresence mode="wait">
          {gameState === 'setup' && (
            <motion.div 
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center">
                <h1 className="text-6xl font-black text-black tracking-tighter uppercase italic leading-none">
                  PERFECT <span className="text-red-600">SNAP</span>
                </h1>
                <p className="text-slate-500 mt-2 font-medium">Thử thách phản xạ theo từ khóa bài hát!</p>
              </div>
              
              <div className="space-y-5 bg-slate-50 p-8 rounded-[2rem] border-2 border-slate-100">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase flex items-center gap-2">
                      <Target className="w-4 h-4" /> Chọn Bộ Đề Có Sẵn
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => selectPreset(preset)}
                          className={`p-4 rounded-xl border-2 transition-all text-left flex flex-col gap-1 ${
                            songInfo?.title === preset.title 
                              ? 'border-red-500 bg-red-50' 
                              : 'border-slate-200 bg-white hover:border-red-300'
                          }`}
                        >
                          <span className="font-black text-sm uppercase text-slate-800">{preset.title}</span>
                          <span className="text-xs text-slate-500 font-bold italic">Từ khóa: "{preset.keyword}"</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {songInfo && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 border-t-2 border-slate-200"
                  >
                    <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                      <h3 className="font-black text-red-600 uppercase text-sm">Đã sẵn sàng!</h3>
                      <p className="text-slate-700 font-bold">{songInfo.title} - {songInfo.artist}</p>
                    </div>
                  </motion.div>
                )}
              </div>

              <button 
                onClick={startGame}
                disabled={!songInfo}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-5 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl shadow-red-200 text-xl uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Play className="w-6 h-6 fill-current" />
                Bắt đầu chơi
              </button>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-12 flex flex-col items-center"
            >
              <div className="flex justify-between w-full items-center">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                  <div className="text-red-600 font-black uppercase tracking-tighter">Đang nghe...</div>
                </div>
                <div className="text-slate-400 text-xs font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200 uppercase">
                  Từ khóa: "{keyword}"
                </div>
              </div>

              <div className="text-center py-4 relative">
                <div id="main-timer" className="text-[120px] font-black leading-none mono-font tracking-tighter">
                  {relativeTime.toFixed(3)}
                </div>
                <div className="text-xs font-black uppercase tracking-[0.4em] text-red-600 mt-2">Seconds</div>
              </div>

              <div className="w-full space-y-4">
                <div className="timeline-wrapper">
                  <div className="absolute left-4 text-black">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                  <div className="main-track">
                    {/* Đáp án bị ẩn khi đang chơi */}
                    <div id="ui-target" className="target-zone opacity-0"></div>
                    {/* Kim dò di chuyển */}
                    <div id="ui-seeker" className="seeker-line" style={{ left: `${progressPercent}%` }}></div>
                  </div>
                </div>
                <div className="flex justify-between px-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>0:00</span>
                  <span>{viewDuration / 2}:00</span>
                  <span>{viewDuration}:00</span>
                </div>
              </div>

              <div className="text-center space-y-6">
                <p 
                  onClick={() => stopGame()}
                  className="text-red-600 font-black text-2xl uppercase italic tracking-tighter animate-bounce cursor-pointer active:scale-95 transition-transform"
                >
                  Nhấn [PHÍM CÁCH] ngay!
                </p>
                <button 
                  onClick={resetGame}
                  className="text-slate-400 hover:text-red-600 font-bold text-sm uppercase transition-colors flex items-center gap-2 mx-auto"
                >
                  <XCircle className="w-4 h-4" />
                  Hủy lượt chơi
                </button>
              </div>
            </motion.div>
          )}

          {gameState === 'result' && (
            <motion.div 
              key="result"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 text-center"
            >
              <div className="text-8xl mx-auto drop-shadow-lg">
                {isSuccess ? '👑' : '💥'}
              </div>
              <h2 className={`text-5xl font-black tracking-tighter uppercase italic ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                {isSuccess ? 'PERFECT SNAP!' : 'SAI NHỊP RỒI!'}
              </h2>
              
              <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border-4 border-slate-100">
                <div className="flex justify-between items-center border-b-2 border-slate-50 pb-4">
                  <span className="text-slate-400 font-bold uppercase text-sm text-left">Kết quả của bạn:</span>
                  <span className="font-black text-4xl mono-font text-slate-900">{finalTime.toFixed(3)}s</span>
                </div>
                <div className="flex justify-between items-center border-b-2 border-slate-50 pb-4">
                  <span className="text-slate-400 font-bold uppercase text-sm text-left">Khoảng đáp án:</span>
                  <span className="font-black text-xl text-red-600">{targetStart.toFixed(2)}s - {targetEnd.toFixed(2)}s</span>
                </div>
                
                {/* Timeline in Result: Reveal the Target Zone */}
                <div className="w-full space-y-4 pt-4">
                  <div className="timeline-wrapper">
                    <div className="absolute left-4 text-black">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                    <div className="main-track">
                      {/* Lộ diện đáp án */}
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="target-zone" 
                        style={{ left: `${targetStartPct}%`, width: `${targetWidthPct}%` }}
                      />
                      {/* Vị trí kim dò khi dừng */}
                      <div className="seeker-line" style={{ left: `${(finalTime / displayMax) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-slate-600 text-xl font-bold px-6 leading-tight italic">
                {isSuccess 
                  ? `Bắt khoảnh khắc tuyệt vời! Bạn đã chốt hạ từ khóa "${keyword}" cực chuẩn.`
                  : finalTime < targetStart 
                    ? `Quá sớm! Từ khóa "${keyword}" còn ở phía trước.`
                    : `Trễ rồi! Từ khóa "${keyword}" đã vụt qua.`
                }
              </p>

              <button 
                onClick={resetGame}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-6 rounded-3xl transition-all shadow-xl shadow-red-100 text-xl uppercase flex items-center justify-center gap-3"
              >
                <RotateCcw className="w-6 h-6" />
                Chơi lại
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className="fixed top-8 left-1/2 bg-black text-white px-8 py-4 rounded-2xl font-black shadow-2xl z-50 flex items-center gap-3 border-2 border-red-600"
          >
            <AlertCircle className="w-6 h-6 text-red-600" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <audio 
        ref={audioRef} 
        src={audioSrc || undefined} 
        onError={onAudioError}
        className="hidden" 
      />
    </div>
  );
}
