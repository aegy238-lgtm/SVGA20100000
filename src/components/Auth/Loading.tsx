import React from 'react';

export const Loading: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-800 border-t-sky-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-sky-500/20 rounded-full blur-xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};
