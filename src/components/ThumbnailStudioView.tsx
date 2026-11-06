import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ThumbnailStudioState, CharacterEntry, TextOverlay } from '../types';
import { POPULAR_CHARACTERS, fetchFullRoster, fetchArchetypes } from '../services/characterCatalog';
import { 
  Download, 
  FlipHorizontal, 
  Eye, 
  Grid3X3, 
  Layers, 
  Sparkles, 
  Plus, 
  Trash2, 
  Maximize2,
  ChevronRight,
  Search,
  Check
} from 'lucide-react';

interface ThumbnailStudioViewProps {
  state: ThumbnailStudioState;
  onChange: (newState: ThumbnailStudioState) => void;
}

export const ThumbnailStudioView: React.FC<ThumbnailStudioViewProps> = ({ state, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [characterList, setCharacterList] = useState<CharacterEntry[]>(POPULAR_CHARACTERS);
  const [archetypeMap, setArchetypeMap] = useState<Record<string, string[]>>({});
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [activeSlotForPicker, setActiveSlotForPicker] = useState<1 | 2>(1);
  const [elementFilter, setElementFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFeedAuditionOpen, setIsFeedAuditionOpen] = useState(false);

  // Dragging state for character framing
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Cached HTML Image elements
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Load catalogs on mount
  useEffect(() => {
    fetchFullRoster().then(setCharacterList);
    fetchArchetypes().then(setArchetypeMap);
  }, []);

  const getLoadedImage = useCallback((url: string): HTMLImageElement | null => {
    if (!url) return null;
    if (imageCache.current.has(url)) {
      const img = imageCache.current.get(url)!;
      return img.complete && img.naturalWidth > 0 ? img : null;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      renderCanvas();
    };
    imageCache.current.set(url, img);
    return null;
  }, []);

  // Main 1080p Canvas Render Function
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1920;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // 1. Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0a0d14');
    bgGrad.addColorStop(0.5, '#0f1420');
    bgGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle Abyss Hex Pattern / Vortex Lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < width; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 200, height);
      ctx.stroke();
    }

    // Helper: Draw Character Slot
    const drawSlot = (slot: typeof state.side1, clipSide: 'left' | 'right') => {
      ctx.save();

      // Clip half of the canvas
      ctx.beginPath();
      if (clipSide === 'left') {
        ctx.moveTo(0, 0);
        ctx.lineTo(width / 2 + 60, 0);
        ctx.lineTo(width / 2 - 60, height);
        ctx.lineTo(0, height);
      } else {
        ctx.moveTo(width / 2 + 60, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(width / 2 - 60, height);
      }
      ctx.closePath();
      ctx.clip();

      // Draw element atmospheric backglow
      const elemColors: Record<string, string> = {
        Pyro: 'rgba(255, 107, 0, 0.22)',
        Hydro: 'rgba(0, 180, 255, 0.22)',
        Anemo: 'rgba(56, 239, 125, 0.20)',
        Electro: 'rgba(189, 0, 255, 0.22)',
        Dendro: 'rgba(126, 211, 33, 0.20)',
        Cryo: 'rgba(0, 229, 255, 0.22)',
        Geo: 'rgba(254, 214, 98, 0.22)'
      };
      const glow = elemColors[slot.element] || 'rgba(254, 214, 98, 0.15)';
      const grad = ctx.createRadialGradient(
        clipSide === 'left' ? 480 : 1440,
        540,
        100,
        clipSide === 'left' ? 480 : 1440,
        540,
        700
      );
      grad.addColorStop(0, glow);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(clipSide === 'left' ? 0 : width / 2 - 100, 0, width / 2 + 200, height);

      // Draw Character Artwork
      const img = getLoadedImage(slot.artUrl);
      if (img) {
        ctx.save();
        const baseCenterX = clipSide === 'left' ? 480 : 1440;
        const baseCenterY = 540;
        const drawX = baseCenterX + slot.panX;
        const drawY = baseCenterY + slot.panY;

        ctx.translate(drawX, drawY);
        if (slot.mirror) {
          ctx.scale(-1, 1);
        }

        const aspect = img.naturalWidth / img.naturalHeight;
        const targetHeight = 1100 * slot.scale;
        const targetWidth = targetHeight * aspect;

        ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
        ctx.restore();
      }

      // Draw Character Headline Label (Two-Tone Donaturine Style)
      ctx.save();
      const textX = clipSide === 'left' ? 120 : width - 120;
      const textY = 220;
      ctx.textAlign = clipSide === 'left' ? 'left' : 'right';

      // Constellation Badge
      ctx.font = '900 36px "Montserrat", sans-serif';
      ctx.fillStyle = '#FED662';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 10;
      ctx.fillText(slot.constellation || 'C0', textX, textY - 50);

      // Character Name
      ctx.font = '900 84px "Anton", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#000000';
      ctx.strokeText((slot.character || 'CHARACTER').toUpperCase(), textX, textY + 30);
      ctx.fillText((slot.character || 'CHARACTER').toUpperCase(), textX, textY + 30);

      // Archetype (e.g. OVERLOAD, RAINBOW HYPER)
      ctx.font = '900 44px "Bebas Neue", sans-serif';
      const archetypeColor = slot.element === 'Pyro' ? '#FF6B00' : slot.element === 'Hydro' ? '#00B4FF' : slot.element === 'Anemo' ? '#38EF7D' : slot.element === 'Electro' ? '#BD00FF' : '#FED662';
      ctx.fillStyle = archetypeColor;
      ctx.lineWidth = 8;
      ctx.strokeStyle = '#000000';
      ctx.strokeText((slot.archetype || 'HYPERCARRY').toUpperCase(), textX, textY + 85);
      ctx.fillText((slot.archetype || 'HYPERCARRY').toUpperCase(), textX, textY + 85);

      // Bottom 4-Man Team Dock
      const dockY = height - 140;
      const dockStartX = clipSide === 'left' ? 100 : width - 420;
      slot.teammates.forEach((tmName, idx) => {
        const itemX = dockStartX + idx * 80;
        ctx.fillStyle = 'rgba(15, 20, 32, 0.85)';
        ctx.strokeStyle = 'rgba(254, 214, 98, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(itemX + 32, dockY + 32, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const tmObj = characterList.find(c => c.name.toLowerCase() === tmName.toLowerCase());
        if (tmObj) {
          const tmImg = getLoadedImage(tmObj.avatarUrl);
          if (tmImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(itemX + 32, dockY + 32, 30, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(tmImg, itemX + 2, dockY + 2, 60, 60);
            ctx.restore();
          }
        }
      });

      ctx.restore();
      ctx.restore();
    };

    // Draw Left and Right sides
    drawSlot(state.side1, 'left');
    drawSlot(state.side2, 'right');

    // 2. Draw Center Divider (Spire vs Rosette vs Line)
    ctx.save();
    if (state.centerStyle === 'spire') {
      // Golden Spiral Spire Pillar
      const cx = width / 2;
      const gradLine = ctx.createLinearGradient(cx - 8, 0, cx + 8, height);
      gradLine.addColorStop(0, '#FED662');
      gradLine.addColorStop(0.5, '#FFFFFF');
      gradLine.addColorStop(1, '#FED662');
      ctx.strokeStyle = gradLine;
      ctx.lineWidth = 6;
      ctx.shadowColor = 'rgba(254, 214, 98, 0.8)';
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.moveTo(cx + 60, 0);
      ctx.lineTo(cx - 60, height);
      ctx.stroke();

      // Floor 12 Center Emblem
      const emblemY = 320;
      ctx.fillStyle = '#0F1420';
      ctx.strokeStyle = '#FED662';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(cx, emblemY, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 24px "Montserrat", sans-serif';
      ctx.fillStyle = '#A0AEC0';
      ctx.textAlign = 'center';
      ctx.fillText('FLOOR', cx, emblemY - 20);

      ctx.font = '900 68px "Anton", sans-serif';
      ctx.fillStyle = '#FED662';
      ctx.fillText(state.floor, cx, emblemY + 40);

      if (state.showHook) {
        // Red / Gold Hook Banner
        const hookY = emblemY + 120;
        ctx.fillStyle = '#E53E3E';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(cx - 160, hookY - 26, 320, 52, 8);
        ctx.fill();
        ctx.stroke();

        ctx.font = '900 28px "Anton", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText((state.hookText || 'NEW ENEMY !!').toUpperCase(), cx, hookY + 10);
      }
    } else {
      // Clean Line Divider
      const cx = width / 2;
      ctx.strokeStyle = '#FED662';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + 60, 0);
      ctx.lineTo(cx - 60, height);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Draw Challenge Badges (36★ CLEAR)
    if (state.starBadge.enabled) {
      ctx.save();
      const bx = 120;
      const by = 80;
      ctx.fillStyle = '#FED662';
      ctx.beginPath();
      ctx.roundRect(bx, by, 220, 48, 24);
      ctx.fill();

      ctx.font = '900 26px "Anton", sans-serif';
      ctx.fillStyle = '#080B10';
      ctx.textAlign = 'center';
      ctx.fillText(state.starBadge.text, bx + 110, by + 34);
      ctx.restore();
    }

    // 4. Draw Draggable Text Stamps (Overlays)
    state.overlays.forEach((ov) => {
      ctx.save();
      ctx.translate(ov.x, ov.y);
      ctx.rotate((ov.rotation * Math.PI) / 180);
      ctx.font = `900 ${ov.fontSize}px "${ov.fontFamily || 'Anton'}", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = ov.strokeWidth || 6;
      ctx.strokeStyle = ov.strokeColor || '#000000';
      ctx.strokeText(ov.text, 0, 0);
      ctx.fillStyle = ov.color || '#FFFFFF';
      ctx.fillText(ov.text, 0, 0);
      ctx.restore();
    });

    // 5. Golden Eye-Level Guide
    if (state.showEyeGuide) {
      ctx.save();
      ctx.strokeStyle = 'rgba(254, 214, 98, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(0, 360);
      ctx.lineTo(width, 360);
      ctx.stroke();

      ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FED662';
      ctx.fillText('GOLDEN EYE LEVEL (33% VIEWPORT)', 40, 350);
      ctx.restore();
    }
  }, [state, getLoadedImage, characterList]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Touch & Mouse Dragging for Character Framing
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) * 2.5;
    const dy = (e.clientY - dragStart.y) * 2.5;

    const slotKey = state.activeSlot === 1 ? 'side1' : 'side2';
    onChange({
      ...state,
      [slotKey]: {
        ...state[slotKey],
        panX: state[slotKey].panX + dx,
        panY: state[slotKey].panY + dy
      }
    });

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Zoom slider handler
  const handleScaleChange = (newScale: number) => {
    const slotKey = state.activeSlot === 1 ? 'side1' : 'side2';
    onChange({
      ...state,
      [slotKey]: {
        ...state[slotKey],
        scale: newScale
      }
    });
  };

  // Mirror toggle
  const handleMirrorToggle = () => {
    const slotKey = state.activeSlot === 1 ? 'side1' : 'side2';
    onChange({
      ...state,
      [slotKey]: {
        ...state[slotKey],
        mirror: !state[slotKey].mirror
      }
    });
  };

  // Export 1080p Lossless PNG
  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `Abyss_Thumbnail_${state.side1.character}_${state.side2.character}_1080p.png`;
    a.click();
  };

  // Character selection
  const handleSelectCharacter = (char: CharacterEntry) => {
    const slotKey = activeSlotForPicker === 1 ? 'side1' : 'side2';
    const archetypes = archetypeMap[char.name] || ['HYPERCARRY', 'BURST DPS'];
    const chosenArchetype = archetypes[0] || 'HYPERCARRY';

    onChange({
      ...state,
      [slotKey]: {
        ...state[slotKey],
        character: char.name,
        element: char.element,
        artUrl: char.artUrl || char.avatarUrl,
        archetype: chosenArchetype
      }
    });
    setIsCharModalOpen(false);
  };

  // Add text stamp overlay (e.g. 'C0', 'SOLO', 'F12')
  const handleAddOverlay = (text: string) => {
    const newOverlay: TextOverlay = {
      id: `ov_${Date.now()}`,
      text,
      x: 960,
      y: 240,
      fontSize: 80,
      fontFamily: 'Anton',
      color: '#FFFFFF',
      strokeColor: '#000000',
      strokeWidth: 6,
      rotation: -5
    };
    onChange({
      ...state,
      overlays: [...state.overlays, newOverlay]
    });
  };

  const activeSlotData = state.activeSlot === 1 ? state.side1 : state.side2;

  // Filter characters in picker
  const filteredChars = characterList.filter((c) => {
    const matchesElem = elementFilter === 'all' || c.element.toLowerCase() === elementFilter.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesElem && matchesSearch;
  });

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Viewport Canvas Card */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0F1420] border border-[#232B38] shadow-2xl">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="w-full aspect-[16/9] object-contain cursor-grab active:cursor-grabbing touch-none select-none"
        />

        {/* Canvas Overlay Controls */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {/* Active Slot Selector (1 or 2) */}
          <div className="flex bg-[#0B0E14]/90 backdrop-blur-md rounded-xl p-1 border border-[#232B38]">
            <button
              onClick={() => onChange({ ...state, activeSlot: 1 })}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                state.activeSlot === 1 ? 'bg-[#FED662] text-[#0B0E14]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side 1: {state.side1.character}
            </button>
            <button
              onClick={() => onChange({ ...state, activeSlot: 2 })}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                state.activeSlot === 2 ? 'bg-[#FED662] text-[#0B0E14]' : 'text-slate-400 hover:text-white'
              }`}
            >
              Side 2: {state.side2.character}
            </button>
          </div>

          <button
            onClick={() => onChange({ ...state, showEyeGuide: !state.showEyeGuide })}
            className={`p-2 rounded-xl backdrop-blur-md border transition-colors ${
              state.showEyeGuide
                ? 'bg-[#FED662]/20 border-[#FED662] text-[#FED662]'
                : 'bg-[#0B0E14]/80 border-[#232B38] text-slate-400 hover:text-white'
            }`}
            title="Toggle Golden Eye-Level Guide"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-2">
          <button
            onClick={() => setIsFeedAuditionOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-[#0B0E14]/90 backdrop-blur-md border border-[#232B38] text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <Grid3X3 className="w-3.5 h-3.5 text-[#00E5FF]" />
            A/B Feed
          </button>
          <button
            onClick={handleExportPNG}
            className="px-3 py-1.5 rounded-xl bg-[#FED662] text-[#0B0E14] text-xs font-bold shadow-lg hover:brightness-110 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            1080p PNG
          </button>
        </div>
      </div>

      {/* Touch-Friendly Framing & Roster Controls */}
      <div className="bg-[#151A23] rounded-2xl p-4 border border-[#232B38] flex flex-col gap-4">
        {/* Character Identity & Swap */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={activeSlotData.artUrl}
                alt={activeSlotData.character}
                className="w-14 h-14 rounded-xl object-cover bg-[#0B0E14] border border-[#232B38]"
              />
              <span className="absolute -bottom-1 -right-1 text-[10px] font-black px-1.5 py-0.2 rounded bg-[#FED662] text-[#0B0E14]">
                {activeSlotData.constellation}
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                {activeSlotData.character}
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#232B38] text-slate-300">
                  {activeSlotData.element}
                </span>
              </div>
              <div className="text-xs text-[#FED662] font-semibold tracking-wider">
                {activeSlotData.archetype}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveSlotForPicker(state.activeSlot);
              setIsCharModalOpen(true);
            }}
            className="px-3 py-2 rounded-xl bg-[#232B38] text-white text-xs font-semibold hover:bg-[#2C3646] flex items-center gap-1.5"
          >
            Change Hero
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Framing Slider (Scale & Mirror) */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#232B38]/60">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Zoom Scale</span>
              <span className="font-mono">{activeSlotData.scale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.8"
              step="0.05"
              value={activeSlotData.scale}
              onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
              className="w-full accent-[#FED662] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <button
              onClick={handleMirrorToggle}
              className={`px-3 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeSlotData.mirror
                  ? 'bg-[#FED662]/20 border-[#FED662] text-[#FED662]'
                  : 'bg-[#0B0E14] border-[#232B38] text-slate-300 hover:text-white'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              Mirror Character
            </button>
          </div>
        </div>

        {/* Quick Challenge Stamp Badges */}
        <div className="pt-2 border-t border-[#232B38]/60">
          <div className="text-xs font-semibold text-slate-400 mb-2">Challenge Stamps & Badges</div>
          <div className="flex flex-wrap gap-2">
            {['C0', 'SOLO', 'F12', 'NO HEALER', '4★ ONLY', 'SPEEDRUN'].map((badge) => (
              <button
                key={badge}
                onClick={() => handleAddOverlay(badge)}
                className="px-2.5 py-1.5 rounded-lg bg-[#0B0E14] border border-[#232B38] text-xs font-bold text-slate-300 hover:border-[#FED662] hover:text-[#FED662] flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3 h-3" />
                {badge}
              </button>
            ))}

            <button
              onClick={() =>
                onChange({
                  ...state,
                  starBadge: {
                    ...state.starBadge,
                    enabled: !state.starBadge.enabled
                  }
                })
              }
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
                state.starBadge.enabled
                  ? 'bg-[#FED662] text-[#0B0E14] border-[#FED662]'
                  : 'bg-[#0B0E14] text-slate-300 border-[#232B38]'
              }`}
            >
              36★ CLEAR
            </button>
          </div>
        </div>
      </div>

      {/* Character Picker Modal */}
      {isCharModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#151A23] w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-[#232B38] max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#232B38] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Select Character</h3>
                <p className="text-xs text-slate-400">Official HoYoWiki transparent artwork</p>
              </div>
              <button
                onClick={() => setIsCharModalOpen(false)}
                className="px-3 py-1 rounded-lg bg-[#232B38] text-xs text-slate-300"
              >
                Close
              </button>
            </div>

            {/* Element Filter Pills */}
            <div className="p-3 border-b border-[#232B38] flex gap-1.5 overflow-x-auto">
              {['all', 'Pyro', 'Hydro', 'Anemo', 'Electro', 'Dendro', 'Cryo', 'Geo'].map((elem) => (
                <button
                  key={elem}
                  onClick={() => setElementFilter(elem)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    elementFilter === elem
                      ? 'bg-[#FED662] text-[#0B0E14] font-bold'
                      : 'bg-[#0B0E14] text-slate-400 hover:text-white'
                  }`}
                >
                  {elem.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-[#232B38]">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by character name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0B0E14] border border-[#232B38] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#FED662]"
                />
              </div>
            </div>

            {/* Character Grid */}
            <div className="p-3 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 gap-2.5">
              {filteredChars.map((char) => (
                <button
                  key={char.name}
                  onClick={() => handleSelectCharacter(char)}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-[#0B0E14] border border-[#232B38] hover:border-[#FED662] transition-colors group"
                >
                  <img
                    src={char.avatarUrl}
                    alt={char.name}
                    className="w-14 h-14 rounded-lg object-cover bg-slate-900 group-hover:scale-105 transition-transform"
                  />
                  <span className="text-[11px] font-semibold text-slate-200 text-center truncate w-full">
                    {char.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* A/B YouTube Feed Audition Modal */}
      {isFeedAuditionOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0F1420] w-full max-w-md rounded-2xl border border-[#232B38] p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#232B38] pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-[#00E5FF]" />
                YouTube Mobile Feed Audition
              </h3>
              <button
                onClick={() => setIsFeedAuditionOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Simulated YouTube Card */}
            <div className="bg-[#000000] rounded-xl overflow-hidden border border-neutral-800">
              <div className="relative aspect-[16/9] bg-neutral-900">
                <canvas
                  ref={(c) => {
                    if (c && canvasRef.current) {
                      const ctx = c.getContext('2d');
                      if (ctx) {
                        c.width = 640;
                        c.height = 360;
                        ctx.drawImage(canvasRef.current, 0, 0, 640, 360);
                      }
                    }
                  }}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                  06:48
                </span>
              </div>
              <div className="p-3 flex gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FED662] shrink-0 flex items-center justify-center text-[#0B0E14] font-black text-xs">
                  GS
                </div>
                <div>
                  <div className="text-xs font-bold text-white line-clamp-2">
                    {state.side1.constellation} {state.side1.character} & {state.side2.constellation} {state.side2.character} Spiral Abyss 12-3 DESTROYED (Fastest Clear)
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    Genshin Abyss Studio · 48K views · 2 hours ago
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Verified CTR test: High-contrast character silhouettes and two-tone headlines remain readable even on small 375px mobile displays.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
