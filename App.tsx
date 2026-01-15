
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TimerDisplay from './components/TimerDisplay';
import EInkButton from './components/EInkButton';
import { View, Lap, ResultBlock } from './types';

const RESULTS_STORAGE_KEY = 'sekuntikello_results_v6';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.STOPWATCH);
  const [time, setTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  // Tulokset ryhmitellään sessioittain (käynnistyksestä nollaukseen)
  const [resultBlocks, setResultBlocks] = useState<ResultBlock[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const isNewSessionRef = useRef<boolean>(true);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Lataa tallennetut tulokset
  useEffect(() => {
    const saved = localStorage.getItem(RESULTS_STORAGE_KEY);
    if (saved) {
      try { 
        setResultBlocks(JSON.parse(saved)); 
        isNewSessionRef.current = true;
      } catch (e) { 
        console.error("Virhe ladattaessa tuloksia", e); 
      }
    }
  }, []);

  // Tallenna automaattisesti localStorageen
  useEffect(() => {
    localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(resultBlocks));
  }, [resultBlocks]);

  const tick = useCallback(() => {
    setTime(Date.now() - startTimeRef.current);
  }, []);

  // Apufunktio ajan kirjaamiseen
  const addTiming = useCallback((duration: number, label: string = 'Aika') => {
    if (duration === 0) return;

    const newTiming: Lap = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      duration: duration,
      label: label
    };

    setResultBlocks(prev => {
      // Tarkistus: jos viimeisin kirjattu aika on täsmälleen sama (esim. painettu Kierros ja heti perään Lopeta)
      if (prev.length > 0 && prev[0].timings.length > 0) {
        if (prev[0].timings[0].duration === duration) return prev;
      }

      if (isNewSessionRef.current || prev.length === 0) {
        isNewSessionRef.current = false;
        return [{
          id: Math.random().toString(36).substr(2, 9),
          timestamp: Date.now(),
          timings: [newTiming]
        }, ...prev];
      } else {
        const updatedBlock = {
          ...prev[0],
          timings: [newTiming, ...prev[0].timings]
        };
        return [updatedBlock, ...prev.slice(1)];
      }
    });
  }, []);

  const handleStartStop = () => {
    if (isRunning) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      setIsRunning(false);
      // AUTOMAATTINEN KIRJAUS PYSÄYTETTÄESSÄ
      addTiming(time, 'Loppuaika');
    } else {
      startTimeRef.current = Date.now() - time;
      timerRef.current = window.setInterval(tick, 10);
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setIsRunning(false);
    setTime(0);
    isNewSessionRef.current = true;
  };

  const clearResults = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Haluatko varmasti tyhjentää kaikki kirjatut tulokset?')) {
      setResultBlocks([]);
      handleReset();
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleLap = () => {
    if (time > 0) {
      addTiming(time, 'Väliaika');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-[#fcfcfc] text-black font-['JetBrains_Mono'] overflow-hidden border-x-2 border-black">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b-4 border-black bg-white shrink-0 h-20">
        <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tighter uppercase italic leading-none">Sekuntikello</h1>
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter mt-1">Treenikello — Jokainen sekunti lasketaan</span>
        </div>
        <div className="flex gap-2">
           <button onClick={toggleFullscreen} className="p-2 border-2 border-black rounded-sm bg-white active:bg-black active:text-white shrink-0">
             {isFullscreen ? <MinimizeIcon size={20}/> : <MaximizeIcon size={20}/>}
           </button>
           <button onClick={() => setView(view === View.STOPWATCH ? View.HISTORY : View.STOPWATCH)} className="p-2 border-2 border-black rounded-sm bg-white active:bg-black active:text-white shrink-0">
            {view === View.STOPWATCH ? <HistoryIcon size={20} /> : <TimerIcon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col p-4 bg-[#fcfcfc]">
        {view === View.STOPWATCH ? (
          <div className="flex flex-col h-full space-y-6">
            <div className="shrink-0 h-40">
              <TimerDisplay 
                time={time} 
                subLabel={isRunning ? 'KÄYNNISSÄ' : 'VALMIS'} 
              />
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center border-b border-neutral-300 pb-1 mb-2">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Kirjatut tulokset</h3>
                {resultBlocks.length > 0 && (
                  <button 
                    onClick={clearResults} 
                    className="text-[10px] font-bold border border-neutral-300 px-2 py-0.5 rounded-sm bg-white active:bg-black active:text-white uppercase transition-colors"
                  >
                    Tyhjennä
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-10">
                {resultBlocks.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center border border-dashed border-neutral-200 text-neutral-300 font-bold uppercase text-[10px] h-32 rounded-sm">
                    <span>Ei tallennettuja aikoja</span>
                  </div>
                ) : (
                  resultBlocks.map((block) => (
                    <div key={block.id} className="border-l border-neutral-300 pl-4 py-1 space-y-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-black uppercase opacity-30">
                          {block.timings.length > 1 ? 'Sarja' : 'Mittaus'}
                        </span>
                        <span className="text-[9px] opacity-20">
                          {new Date(block.timestamp).toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {block.timings.map((t, idx) => (
                          <div key={t.id} className="flex justify-between items-center border-b border-neutral-50 pb-1">
                            <span className="text-[10px] font-bold opacity-50 uppercase">
                              {t.label === 'Loppuaika' ? 'Loppu' : `Aika ${block.timings.length - idx}`}
                            </span>
                            <span className="font-mono text-xl font-bold leading-none">
                              {(t.duration / 1000).toFixed(2)}<span className="text-xs opacity-40 ml-0.5 font-sans">s</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            <h2 className="text-xl font-bold uppercase border-b border-black pb-1">Arkisto</h2>
            <div className="space-y-4">
               {resultBlocks.length === 0 ? <p className="text-sm italic opacity-40">Ei historiaa.</p> : 
               resultBlocks.map(block => (
                 <div key={block.id} className="border border-neutral-100 p-3 rounded-sm bg-white">
                   <div className="flex justify-between text-[10px] font-bold opacity-40 mb-2">
                     <span>{new Date(block.timestamp).toLocaleDateString('fi-FI')}</span>
                     <span>{new Date(block.timestamp).toLocaleTimeString('fi-FI')}</span>
                   </div>
                   {block.timings.map((t, i) => (
                      <div key={t.id} className="flex justify-between text-sm py-0.5 border-b border-neutral-50 last:border-0">
                        <span className="opacity-60">{t.label}</span>
                        <span className="font-bold">{(t.duration/1000).toFixed(2)}s</span>
                      </div>
                   ))}
                 </div>
               ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer - Kiinteät korkeudet estävät hyppimisen */}
      <nav className="p-4 bg-white border-t-4 border-black shrink-0 h-48 flex flex-col justify-center space-y-4">
        {view === View.STOPWATCH ? (
          <>
            <div className="h-20 w-full relative">
              <button 
                onClick={handleStartStop} 
                className={`absolute inset-0 w-full h-full text-3xl font-black rounded-sm border-4 border-black transition-all duration-75 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 active:translate-x-1 ${
                  isRunning 
                  ? 'bg-white text-black active:bg-neutral-100' 
                  : 'bg-black text-white active:bg-neutral-800'
                }`}
              >
                <span className="relative z-10 pointer-events-none">
                  {isRunning ? 'LOPETA' : 'KÄYNNISTÄ'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 h-12">
              <EInkButton onClick={handleReset} variant="secondary" className="w-full text-xs h-full">Nollaa</EInkButton>
              <EInkButton 
                onClick={handleLap} 
                disabled={time === 0} 
                variant="secondary" 
                className="w-full text-xs h-full font-bold"
              >
                Kirjaa aika
              </EInkButton>
            </div>
          </>
        ) : (
          <EInkButton onClick={() => setView(View.STOPWATCH)} className="w-full h-16 text-lg">Takaisin kelloon</EInkButton>
        )}
      </nav>
    </div>
  );
};

// Icon-komponentit
const MaximizeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
);
const MinimizeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M10 14l-7 7"/></svg>
);
const TimerIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const HistoryIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);

export default App;
