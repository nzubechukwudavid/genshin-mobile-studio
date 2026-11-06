import React, { useState, useEffect, useCallback } from 'react';
import { 
  EditingMode, 
  StygianTopology, 
  ClipSlot, 
  RawRecording, 
  BgmTrack, 
  ThumbnailStudioState 
} from './types';
import { INITIAL_RECORDINGS, createInitialSlots } from './services/trimmerEngine';
import { DEFAULT_BGM_TRACKS, recommendBgmSuite } from './services/musicRecommender';
import { TopHeader } from './components/TopHeader';
import { BottomNavigation } from './components/BottomNavigation';
import { ArrangerView } from './components/ArrangerView';
import { ThumbnailStudioView } from './components/ThumbnailStudioView';
import { BgmManagerView } from './components/BgmManagerView';
import { RenderModal } from './components/RenderModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'arranger' | 'thumbnail' | 'bgm'>('arranger');
  const [mode, setMode] = useState<EditingMode>('basic');
  const [stygianTopology, setStygianTopology] = useState<StygianTopology>('topology_2x2');
  
  const [recordings, setRecordings] = useState<RawRecording[]>(INITIAL_RECORDINGS);
  const [slots, setSlots] = useState<ClipSlot[]>(() => createInitialSlots('basic'));
  const [bgmTracks, setBgmTracks] = useState<BgmTrack[]>(DEFAULT_BGM_TRACKS);
  
  const [isScanning, setIsScanning] = useState(false);
  const [shizukuActive, setShizukuActive] = useState(true); // User confirmed Shizuku is enabled on their Xiaomi 13T Pro
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);

  // Thumbnail Studio State
  const [thumbnailState, setThumbnailState] = useState<ThumbnailStudioState>({
    layoutMode: 'dual',
    side1: {
      character: 'Mavuika',
      element: 'Pyro',
      constellation: 'C0',
      archetype: 'OVERLOAD',
      customName: '',
      artUrl: 'https://act-webstatic.hoyoverse.com/event-static-hoyowiki-admin/2024/12/31/54d909eb97cf7095c9ee6e0ec2dca0ea_2299718428236109315.png',
      scale: 1.05,
      panX: -40,
      panY: 0,
      mirror: false,
      teammates: ['Mavuika', 'Iansan', 'Chevreuse', 'Ororon']
    },
    side2: {
      character: 'Chasca',
      element: 'Anemo',
      constellation: 'C0',
      archetype: 'RAINBOW HYPER',
      customName: '',
      artUrl: 'https://act-webstatic.hoyoverse.com/event-static-hoyowiki-admin/2024/11/19/04d7c2f0f46f53e6b783ef8735dfdb96_7653634045524675549.png',
      scale: 1.05,
      panX: 40,
      panY: 0,
      mirror: true,
      teammates: ['Chasca', 'Furina', 'Bennett', 'Ororon']
    },
    centerStyle: 'spire',
    floor: '12',
    hookText: 'NEW ENEMY !!',
    showHook: true,
    starBadge: {
      enabled: true,
      text: '36★ CLEAR'
    },
    watermark: {
      enabled: false,
      text: '@AbyssStudio'
    },
    overlays: [],
    activeSlot: 1,
    showEyeGuide: false
  });

  // Re-initialize slots when mode changes
  const handleModeChange = (newMode: EditingMode) => {
    setMode(newMode);
    setSlots(createInitialSlots(newMode));
  };

  // Re-calculate BGM assignments whenever slots or clips change
  const updateBgmAssignments = useCallback((currentSlots: ClipSlot[], catalog: BgmTrack[]) => {
    const slotConfigs = currentSlots.map((s) => ({
      key: s.id,
      label: s.title,
      targetSec: s.effectiveCombatSec > 0 ? s.effectiveCombatSec : 120,
      preferEnergy: (s.chamberKey === 'builds' ? 'chill' : 'high') as 'chill' | 'high'
    }));

    const recommendations = recommendBgmSuite(slotConfigs, catalog);

    return currentSlots.map((s) => {
      const rec = recommendations[s.id];
      if (!rec) return s;

      return {
        ...s,
        assignedBgm: rec.selected,
        bgmAlternatives: rec.alternatives
      };
    });
  }, []);

  // Update slots and trigger BGM auto-score
  const handleSlotsChange = (newSlots: ClipSlot[]) => {
    const withBgm = updateBgmAssignments(newSlots, bgmTracks);
    setSlots(withBgm);
  };

  // Initialize initial BGM assignments on mount
  useEffect(() => {
    setSlots((prev) => updateBgmAssignments(prev, bgmTracks));
  }, [updateBgmAssignments, bgmTracks]);

  // Pull-to-refresh / scan screen recordings simulation
  const handleRefreshRecordings = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 600);
  };

  // Delete a failed attempt clip
  const handleDeleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    // Clear from slots if assigned
    setSlots((prev) =>
      prev.map((s) =>
        s.assignedClip?.id === id ? { ...s, assignedClip: null, effectiveCombatSec: 0 } : s
      )
    );
  };

  // Add a custom music track
  const handleAddTrack = (track: BgmTrack) => {
    const newCatalog = [...bgmTracks, track];
    setBgmTracks(newCatalog);
    setSlots((prev) => updateBgmAssignments(prev, newCatalog));
  };

  const filledCount = slots.filter((s) => s.assignedClip).length;

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100 flex flex-col max-w-md mx-auto relative shadow-2xl">
      {/* Top Mobile Header */}
      <TopHeader
        shizukuActive={shizukuActive}
        onToggleShizuku={() => setShizukuActive(!shizukuActive)}
        onRefresh={handleRefreshRecordings}
        isRefreshing={isScanning}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'arranger' && (
          <ArrangerView
            mode={mode}
            onModeChange={handleModeChange}
            stygianTopology={stygianTopology}
            onTopologyChange={setStygianTopology}
            slots={slots}
            onSlotsChange={handleSlotsChange}
            recordings={recordings}
            onDeleteRecording={handleDeleteRecording}
            onAddRecording={(r) => setRecordings((prev) => [r, ...prev])}
            onRefreshRecordings={handleRefreshRecordings}
            isScanning={isScanning}
            shizukuActive={shizukuActive}
          />
        )}

        {activeTab === 'thumbnail' && (
          <ThumbnailStudioView
            state={thumbnailState}
            onChange={setThumbnailState}
          />
        )}

        {activeTab === 'bgm' && (
          <BgmManagerView
            tracks={bgmTracks}
            onAddTrack={handleAddTrack}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenRender={() => setIsRenderModalOpen(true)}
        filledSlotsCount={filledCount}
        totalSlotsCount={slots.length}
      />

      {/* Hardware Media3 Render & Assembly Modal */}
      {isRenderModalOpen && (
        <RenderModal
          slots={slots}
          thumbnailState={thumbnailState}
          onClose={() => setIsRenderModalOpen(false)}
          shizukuActive={shizukuActive}
        />
      )}
    </div>
  );
}
