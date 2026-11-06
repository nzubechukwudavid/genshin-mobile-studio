import React, { useState, useEffect } from 'react';
import { Cpu, Zap, RefreshCw, Smartphone, Download } from 'lucide-react';

interface TopHeaderProps {
  shizukuActive: boolean;
  onToggleShizuku: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  shizukuActive,
  onToggleShizuku,
  onRefresh,
  isRefreshing
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    const handlePrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0E14]/90 backdrop-blur-md border-b border-[#232B38] px-4 py-3 flex items-center justify-between">
      {/* Brand Identity */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FED662] to-[#FF6B00] flex items-center justify-center shadow-lg shadow-[#FED662]/10">
          <Smartphone className="w-4 h-4 text-[#0B0E14] stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-sm font-extrabold text-white tracking-tight leading-none">
            Android Auto-Editor
          </h1>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            Xiaomi 13T Pro · Dimensity 9200+
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {/* PWA Install Button when available */}
        {!isInstalled && deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="px-2.5 py-1 rounded-xl bg-[#FED662] text-[#0B0E14] text-[11px] font-extrabold flex items-center gap-1 shadow-md hover:brightness-110 animate-bounce"
            title="Install to Home Screen"
          >
            <Download className="w-3 h-3 stroke-[2.5]" />
            Install
          </button>
        )}

        <button
          onClick={onToggleShizuku}
          className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all ${
            shizukuActive
              ? 'bg-[#00E5FF]/10 border-[#00E5FF] text-[#00E5FF]'
              : 'bg-[#151A23] border-[#232B38] text-slate-400 hover:text-white'
          }`}
          title="Toggle Shizuku ADB Daemon Access"
        >
          <Zap className={`w-3 h-3 ${shizukuActive ? 'fill-[#00E5FF]' : ''}`} />
          {shizukuActive ? 'Shizuku ADB' : 'Standard SAF'}
        </button>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-1.5 rounded-xl bg-[#151A23] border border-[#232B38] text-slate-300 hover:text-white disabled:opacity-50"
          title="Scan Recent Screen Recordings"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#FED662]' : ''}`} />
        </button>
      </div>
    </header>
  );
};
