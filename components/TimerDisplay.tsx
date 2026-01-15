
import React from 'react';

interface TimerDisplayProps {
  time: number;
  subLabel?: string;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ time, subLabel }) => {
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);

    return {
      min: minutes.toString().padStart(2, '0'),
      sec: seconds.toString().padStart(2, '0'),
      cs: centiseconds.toString().padStart(2, '0'),
    };
  };

  const { min, sec, cs } = formatTime(time);

  return (
    <div className="flex flex-col items-center justify-center py-4 px-4 border-4 border-black bg-white w-full h-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-sm">
      <div className="h-6 mb-1 flex items-center justify-center w-full">
        {subLabel && (
          <span className="text-[10px] font-black uppercase tracking-widest border border-black px-3 py-0.5 bg-neutral-50 rounded-sm">
            {subLabel}
          </span>
        )}
      </div>
      <div className="flex items-baseline font-mono text-6xl tracking-tighter leading-none select-none text-black">
        <span className="font-bold">{min}</span>
        <span className="text-2xl mx-0.5 opacity-20 font-black">:</span>
        <span className="font-bold">{sec}</span>
        <span className="text-2xl mx-0.5 opacity-20 font-black">.</span>
        <span className="text-4xl font-normal opacity-80">{cs}</span>
      </div>
    </div>
  );
};

export default TimerDisplay;
