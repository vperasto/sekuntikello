import React, { useState, useEffect, useRef, useCallback } from 'react';
import TimerDisplay from './components/TimerDisplay';
import EInkButton from './components/EInkButton';
import { View, Lap, Run, Session } from './types';

// Vaihdettu avain uuteen versioon tietokantamuutoksen takia
const RESULTS_STORAGE_KEY = 'sekuntikello_sessions_v7';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.STOPWATCH);
  const [time, setTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  // Tallennetaan sessiot. sessions[0] on uusin.
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // isSessionActive: Onko meillä "paperi" pöydällä johon kirjoitamme tuloksia?
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  // Väliaikaiset lapit nykyiselle juoksulle (ennen kuin Stop painetaan)
  const [currentRunLaps, setCurrentRunLaps] = useState<Lap[]>([]);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  // Lataa tallennetut tulokset
  useEffect(() => {
    const saved = localStorage.getItem(RESULTS_STORAGE_KEY);
    if (saved) {
      try { 
        setSessions(JSON.parse(saved)); 
        setIsSessionActive(false); 
      } catch (e) { 
        console.error("Virhe ladattaessa tuloksia", e); 
      }
    }
  }, []);

  // Tallenna automaattisesti localStorageen
  useEffect(() => {
    localStorage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const tick = useCallback(() => {
    setTime(Date.now() - startTimeRef.current);
  }, []);

  const handleStartStop = () => {
    if (isRunning) {
      // STOP: Lopetetaan mittaus ja tallennetaan se
      if (timerRef.current) window.clearInterval(timerRef.current);
      setIsRunning(false);
      
      const finalDuration = time;
      
      // Luodaan uusi "Run" (Yksittäinen mittaustapahtuma)
      const newRun: Run = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        laps: [
            ...currentRunLaps, 
            {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: Date.now(),
                duration: finalDuration,
                label: 'Loppuaika'
            }
        ]
      };

      setSessions(prev => {
        // Jos sessio on aktiivinen (tai juuri aktivoitu), lisätään siihen.
        if (isSessionActive && prev.length > 0) {
           const currentSession = prev[0];
           const updatedSession = {
             ...currentSession,
             runs: [newRun, ...currentSession.runs] // Uusin mittaus pinon päälle
           };
           return [updatedSession, ...prev.slice(1)];
        } else {
           // Fallback, jos jotain outoa tapahtuu tilan kanssa, luodaan uusi
           const newSession: Session = {
             id: Math.random().toString(36).substr(2, 9),
             timestamp: Date.now(),
             runs: [newRun]
           };
           setIsSessionActive(true);
           return [newSession, ...prev];
        }
      });
      
      // Nollataan väliaikaiset lapit, mutta EI aikaa (jotta käyttäjä näkee tuloksen kellossa)
      setCurrentRunLaps([]);

    } else {
      // START: Käynnistetään kello
      
      // Jos ei ole aktiivista sessiota, luodaan se heti Nyt, jotta "paperi on pöydällä"
      if (!isSessionActive) {
          setIsSessionActive(true);
          setSessions(prev => [{
             id: Math.random().toString(36).substr(2, 9),
             timestamp: Date.now(),
             runs: []
          }, ...prev]);
      }

      startTimeRef.current = Date.now() - time;
      timerRef.current = window.setInterval(tick, 10);
      setIsRunning(true);
    }
  };

  const handleReset = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setIsRunning(false);
    setTime(0);
    setCurrentRunLaps([]);
  };

  const endCurrentSession = () => {
     setIsSessionActive(false);
     handleReset();
  };

  const clearHistory = (e: React.MouseEvent) => {
    e.preventDefault();
    // Varmistetaan että käyttäjä todella haluaa tyhjentää
    if (window.confirm('VAROITUS: Oletko aivan varma?\n\nTämä toiminto poistaa KAIKKI tallennetut mittaukset ja sessiot pysyvästi.\n\nKlikkaa OK poistaaksesi historian.')) {
      setSessions([]);
      setIsSessionActive(false);
      handleReset();
    }
  };

  const deleteRun = (sessionId: string, runId: string) => {
    if (!window.confirm('Poistetaanko tämä mittaus?')) return;

    // Lasketaan uusi tila ensin, jotta voimme tarkistaa poistuuko koko sessio
    const updatedSessions = sessions.map(session => {
        if (session.id !== sessionId) return session;
        return {
            ...session,
            runs: session.runs.filter(r => r.id !== runId)
        };
    }).filter(session => session.runs.length > 0);

    // Jos aktiivinen sessio on se jota muokataan, tarkistetaan jäikö se eloon
    if (isSessionActive && sessions.length > 0 && sessions[0].id === sessionId) {
         const activeSessionStillExists = updatedSessions.find(s => s.id === sessionId);
         if (!activeSessionStillExists) {
             // Jos aktiivinen sessio tyhjeni kokonaan, se poistuu listalta -> nollataan aktiivinen tila
             setIsSessionActive(false);
         }
    }

    setSessions(updatedSessions);
  };

  const deleteSession = (sessionId: string) => {
    if (window.confirm('Poistetaanko koko suoritussarja?')) {
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (isSessionActive && sessions.length > 0 && sessions[0].id === sessionId) {
        setIsSessionActive(false);
      }
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
    if (time > 0 && isRunning) {
      const lapTime = time;
      setCurrentRunLaps(prev => [
          {
              id: Math.random().toString(36).substr(2, 9),
              timestamp: Date.now(),
              duration: lapTime,
              label: `Väliaika ${prev.length + 1}`
          },
          ...prev // Lisätään uusin alkuun, jotta se näkyy heti listan kärjessä
      ]);
    }
  };

  const groupedHistory = sessions.reduce((groups, session) => {
    const dateObj = new Date(session.timestamp);
    const dateKey = dateObj.toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric', year: 'numeric' });
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(session);
    return groups;
  }, {} as Record<string, Session[]>);

  const currentActiveSession = isSessionActive && sessions.length > 0 ? sessions[0] : null;

  // Onko meillä "Live" tilanne päällä?
  const hasLiveRun = isRunning || time > 0;

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-[#fcfcfc] text-black font-['JetBrains_Mono'] overflow-hidden border-x-2 border-black">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b-4 border-black bg-white shrink-0 h-20">
        <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tighter uppercase italic leading-none">Treenikello</h1>
            <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter mt-1">Jokainen sekunti lasketaan</span>
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
                subLabel={isRunning ? 'MITTAUS KÄYNNISSÄ' : (time > 0 ? 'PYSÄYTETTY' : 'VALMIS')} 
              />
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex justify-between items-center border-b border-neutral-300 pb-1 mb-2 min-h-[28px]">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">Nykyinen sessio</h3>
                {currentActiveSession && (
                    <button 
                        onClick={endCurrentSession}
                        className="flex items-center gap-1 text-[9px] font-bold uppercase bg-black text-white px-2 py-0.5 rounded-sm hover:bg-neutral-800 transition-colors"
                    >
                        <span>Päätä sessio</span>
                        <span className="text-neutral-400">|</span>
                        <XIcon size={10} />
                    </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-10">
                {!currentActiveSession && !hasLiveRun ? (
                  <div className="py-8 flex flex-col items-center justify-center border border-dashed border-neutral-200 text-neutral-300 font-bold uppercase text-[10px] h-32 rounded-sm text-center px-4">
                    <span>Ei aktiivista sessiota.</span>
                    <span className="mt-1 opacity-50">Käynnistä kello aloittaaksesi uuden sarjan.</span>
                  </div>
                ) : (
                  <div className="bg-white border-l-2 border-black pl-3 py-2 shadow-sm rounded-sm">
                     {currentActiveSession && (
                        <div className="text-[10px] opacity-40 font-bold mb-3 border-b border-neutral-100 pb-1">
                            Aloitettu klo {new Date(currentActiveSession.timestamp).toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'})}
                        </div>
                     )}
                     
                     <div className="space-y-4">
                        {/* LIVE RUN BLOCK - Näkyy VAIN kun kello käy (isRunning) */}
                        {isRunning && (
                            <div className="relative border-2 border-black border-dashed bg-neutral-50 p-2 rounded-sm mb-4">
                                <div className="flex justify-between items-center mb-2 border-b border-neutral-200 pb-1">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-black animate-pulse">
                                        ● KÄYNNISSÄ...
                                    </span>
                                </div>
                                <div className="space-y-0.5">
                                    {currentRunLaps.length === 0 ? (
                                        <div className="text-[10px] italic opacity-40 py-1">Ei väliaikoja</div>
                                    ) : (
                                        currentRunLaps.map((lap) => (
                                            <div key={lap.id} className="flex justify-between items-baseline">
                                                <span className="text-[10px] uppercase text-neutral-500">{lap.label}</span>
                                                <span className="font-mono text-sm leading-tight">
                                                    <FormattedDuration ms={lap.duration} />
                                                </span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* SAVED RUNS */}
                        {currentActiveSession && currentActiveSession.runs.map((run, idx) => (
                           <RunItem 
                             key={run.id} 
                             run={run} 
                             runIndex={currentActiveSession.runs.length - idx} 
                             onDelete={() => deleteRun(currentActiveSession.id, run.id)}
                             isLast={idx === currentActiveSession.runs.length - 1}
                           />
                        ))}
                     </div>
                  </div>
                )}
                
                <div className="w-full text-center pt-6 pb-2">
                  <span className="text-[9px] font-bold opacity-20 uppercase">Copyright Vesa Perasto</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 pb-10">
            <div className="flex justify-between items-end border-b border-black pb-1">
              <h2 className="text-xl font-bold uppercase">Arkisto</h2>
              {sessions.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-[10px] font-bold text-red-600 uppercase hover:underline"
                >
                  Tyhjennä historia
                </button>
              )}
            </div>
            
            <div className="space-y-6">
               {Object.keys(groupedHistory).length === 0 ? <p className="text-sm italic opacity-40">Ei historiaa.</p> : 
               (Object.entries(groupedHistory) as [string, Session[]][]).map(([date, sessionList]) => (
                 <div key={date} className="space-y-2">
                   <h3 className="text-xs font-black uppercase tracking-widest opacity-40 bg-neutral-100 p-1 rounded-sm">{date}</h3>
                   <div className="space-y-4 pl-1">
                    {sessionList.map((session) => (
                      <div key={session.id} className="border border-neutral-200 p-3 rounded-sm bg-white shadow-sm relative group">
                        <button 
                            onClick={() => deleteSession(session.id)}
                            className="absolute top-2 right-2 p-1 text-neutral-300 hover:text-red-500 transition-colors"
                            title="Poista sessio"
                        >
                            <TrashIcon size={14} />
                        </button>
                        <div className="text-[10px] font-bold opacity-40 mb-3 border-b border-neutral-100 pb-1 pr-6">
                          Sessio klo {new Date(session.timestamp).toLocaleTimeString('fi-FI', {hour:'2-digit', minute:'2-digit'})}
                        </div>
                        <div className="space-y-3">
                            {session.runs.map((run, rIdx) => (
                                <RunItem 
                                    key={run.id} 
                                    run={run} 
                                    runIndex={session.runs.length - rIdx} 
                                    isLast={rIdx === session.runs.length - 1}
                                    onDelete={() => deleteRun(session.id, run.id)} // Lisätty deleteRun arkistoon
                                    readOnly={false} // Vaihdettu falseksi jotta roskis näkyy
                                />
                            ))}
                        </div>
                      </div>
                    ))}
                   </div>
                 </div>
               ))}
               
               <div className="w-full text-center pt-8">
                  <span className="text-[9px] font-bold opacity-20 uppercase">Copyright Vesa Perasto</span>
               </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
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
              <EInkButton 
                onClick={handleReset} 
                variant="secondary" 
                className="w-full text-xs h-full"
                disabled={isRunning} // Disabloitu kun käynnissä
              >
                Nollaa
              </EInkButton>
              <EInkButton 
                onClick={handleLap} 
                disabled={!isRunning} 
                variant="secondary" 
                className="w-full text-xs h-full font-bold"
              >
                Väliaika
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

// Komponentti yhden mittauksen (Run) esittämiseen
interface RunItemProps {
    run: Run;
    runIndex: number;
    onDelete?: () => void;
    isLast?: boolean;
    readOnly?: boolean;
}

const RunItem: React.FC<RunItemProps> = ({ run, runIndex, onDelete, isLast, readOnly = false }) => {
    return (
        <div className={`relative ${!isLast ? 'border-b-2 border-dashed border-neutral-200 pb-3' : ''}`}>
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    Mittaus #{runIndex}
                </span>
                {!readOnly && onDelete && (
                    <button 
                        onClick={onDelete}
                        className="text-neutral-300 hover:text-red-600 transition-colors p-1"
                        title="Poista mittaus"
                    >
                        <TrashIcon size={12} />
                    </button>
                )}
            </div>
            <div className="space-y-0.5">
                {run.laps.map((lap, idx) => {
                     const isTotal = lap.label === 'Loppuaika';
                     return (
                        <div key={lap.id} className="flex justify-between items-baseline">
                            <span className={`text-[10px] uppercase ${isTotal ? 'font-bold text-black' : 'text-neutral-500'}`}>
                                {isTotal ? 'Loppuaika' : lap.label}
                            </span>
                            <span className={`font-mono leading-tight ${isTotal ? 'font-bold text-lg' : 'text-sm'}`}>
                                <FormattedDuration ms={lap.duration} />
                            </span>
                        </div>
                     );
                })}
            </div>
        </div>
    );
};

// Apukomponentti ajan muotoiluun (MM.SS.cs)
const FormattedDuration = ({ ms }: { ms: number }) => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  return (
    <>
      {minutes.toString().padStart(2, '0')}.
      {seconds.toString().padStart(2, '0')}.
      <span className="text-[0.8em] opacity-60 ml-0.5">{centiseconds.toString().padStart(2, '0')}</span>
    </>
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
const TrashIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);
const XIcon = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

export default App;