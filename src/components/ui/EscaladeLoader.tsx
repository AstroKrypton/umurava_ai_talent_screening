import React from 'react';

export const EscaladeLoader = () => {
  return (
    <div className="relative flex items-center justify-center w-5 h-5">
      <style>{`
        .escalade-svg { animation: escalade-spin 2s linear infinite; }
        .escalade-circle {
          stroke-dasharray: 1, 200;
          stroke-dashoffset: 0;
          animation: escalade-stretch 1.5s ease-in-out infinite;
          stroke-linecap: round;
        }
        @keyframes escalade-spin { 100% { transform: rotate(360deg); } }
        @keyframes escalade-stretch {
          0% { stroke-dasharray: 1, 200; stroke-dashoffset: 0; }
          50% { stroke-dasharray: 90, 200; stroke-dashoffset: -35px; }
          100% { stroke-dasharray: 90, 200; stroke-dashoffset: -124px; }
        }
      `}</style>
      <svg className="escalade-svg w-full h-full" viewBox="25 25 50 50">
        <defs>
          <linearGradient id="escaladeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0B4F8A" />
            <stop offset="50%" stopColor="#F5C518" />
            <stop offset="100%" stopColor="#1A8C4E" />
          </linearGradient>
        </defs>
        <circle className="escalade-circle" cx="50" cy="50" r="20" fill="none" stroke="url(#escaladeGradient)" strokeWidth="6" />
      </svg>
    </div>
  );
};
