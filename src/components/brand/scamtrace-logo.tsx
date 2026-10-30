import React from 'react';

interface ScamTraceLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
}

export function ScamTraceLogo({
  className = '',
  size = 'md',
  showSubtitle = false,
}: ScamTraceLogoProps) {
  const iconDimensions =
    size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-10 w-10' : 'h-8 w-8';
  const textSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg';

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`${iconDimensions} rounded-lg bg-[#0A2540] flex items-center justify-center relative overflow-hidden shadow-sm ring-1 ring-indigo-500/30`}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5 h-5"
        >
          {/* Outer Radar Shield Arc */}
          <path
            d="M16 3L5 7.5V15.5C5 22.4 9.7 28.6 16 30C22.3 28.6 27 22.4 27 15.5V7.5L16 3Z"
            stroke="#635BFF"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Inner Signal Trace Nodes */}
          <circle cx="16" cy="15" r="3" fill="#00D4B6" />
          <circle cx="11" cy="11" r="1.5" fill="#A5B4FC" />
          <circle cx="21" cy="11" r="1.5" fill="#A5B4FC" />
          <circle cx="16" cy="22" r="1.5" fill="#A5B4FC" />
          <path
            d="M11 11L16 15M21 11L16 15M16 15V22"
            stroke="#A5B4FC"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span
          className={`${textSize} font-bold tracking-tight text-[#0A2540] flex items-center gap-1`}
        >
          Scam<span className="text-[#635BFF]">Trace</span>
        </span>
        {showSubtitle && (
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mt-0.5">
            Explainable Risk Intelligence
          </span>
        )}
      </div>
    </div>
  );
}

