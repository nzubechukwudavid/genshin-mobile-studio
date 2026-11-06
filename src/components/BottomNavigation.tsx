import React from 'react';
import { Film, Image as ImageIcon, Music, Sparkles } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'arranger' | 'thumbnail' | 'bgm';
  onTabChange: (tab: 'arranger' | 'thumbnail' | 'bgm') => void;
  onOpenRender: () => void;
  filledSlotsCount: number;
  totalSlotsCount: number;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  activeTab,
  onTabChange,
  onOpenRender,
  filledSlotsCount,
  totalSlotsCount
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col pointer-events-none">
      {/* Sticky Primary Action CTA Button */}
      <div className="p-3 bg-gradient-to-t from-[#080B10] via-[#080B10]/90 to-transparent pointer-events-auto flex justify-center">
        <button
          onClick={onOpenRender}
          className="w-full max-w-md py-3 px-4 rounded-2xl bg-gradient-to-r from-[#FED662] via-[#FFA000] to-[#FF6B00] text-[#0B0E14] font-extrabold text-sm shadow-xl shadow-[#FED662]/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 fill-[#0B0E14]" />
          <span>RENDER 1080p 60fps MP4</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#0B0E14]/15">
            {filledSlotsCount}/{totalSlotsCount} Ready
          </span>
        </button>
      </div>

      {/* Tab Navigation Anchor */}
      <nav className="bg-[#0B0E14]/95 backdrop-blur-md border-t border-[#232B38] px-4 h-14 flex items-center justify-around pointer-events-auto max-w-md mx-auto w-full">
        <button
          onClick={() => onTabChange('arranger')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'arranger' ? 'text-[#FED662]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Film className="w-4 h-4" />
          <span className="text-[10px] font-bold mt-1">Video Arranger</span>
        </button>

        <button
          onClick={() => onTabChange('thumbnail')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'thumbnail' ? 'text-[#FED662]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span className="text-[10px] font-bold mt-1">1080p Thumbnail</span>
        </button>

        <button
          onClick={() => onTabChange('bgm')}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            activeTab === 'bgm' ? 'text-[#FED662]' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Music className="w-4 h-4" />
          <span className="text-[10px] font-bold mt-1">BGM Library</span>
        </button>
      </nav>
    </div>
  );
};
