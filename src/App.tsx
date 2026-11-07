import React, { useState, useEffect, useCallback } from 'react';
import { 
  EditingMode, 
  StygianTopology, 
  ClipSlot, 
  RawRecording, 
  BgmTrack 
} from './types';
import { INITIAL_RECORDINGS, createInitialSlots } from './services/trimmerEngine';
import { DEFAULT_BGM_TRACKS, recommendBgmSuite } from './services/musicRecommender';
import { 
  checkAndRequestPermissions, 
  checkAndRequestShizuku, 
  autoScanRecordings, 
  autoScanMusic, 
  isNativeAndroid 
} from './services/nativeBridge';
import { TopHeader } from './components/TopHeader';
import { BottomNavigation } from './components/BottomNavigation';
import { ArrangerView } from './components/ArrangerView';
import { BgmManagerView } from './components/BgmManagerView';
import { RenderModal } from './components/RenderModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'arranger' | 'bgm'>('arranger');
  const [mode, setMode] = useState<EditingMode>('basic');
  const [stygianTopology, setStygianTopology] = useState<StygianTopology>('topology_2x2');
  
  // Real user recordings and music tracks
  const [recordings, setRecordings] = useState<RawRecording[]>(INITIAL_RECORDINGS);
  const [slots, setSlots] = useState<ClipSlot[]>(() => createInitialSlots('basic'));
  const [bgmTracks, setBgmTracks] = useState<BgmTrack[]>(DEFAULT_BGM_TRACKS);
  
  const [isScanning, setIsScanning] = useState(false);
  const [shizukuActive, setShizukuActive] = useState(false);
  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);

  // Initialize native permissions, Shizuku, and auto-scan on startup
  useEffect(() => {
    async function initDevice() {
      if (isNativeAndroid) {
        setIsScanning(true);
        // Prompt runtime permissions for media & storage
        await checkAndRequestPermissions();

        // Check Shizuku status
        const shizukuStatus = await checkAndRequestShizuku();
        setShizukuActive(shizukuStatus.isRunning && shizukuStatus.isGranted);

        // Auto-scan recordings from ScreenRecorder
        const recs = await autoScanRecordings('/sdcard/DCIM/ScreenRecorder');
        if (recs && recs.length > 0) {
          setRecordings(recs);
        }

        // Auto-scan music library from /sdcard/Music
        const tracks = await autoScanMusic('/sdcard/Music');
        if (tracks && tracks.length > 0) {
          setBgmTracks(tracks);
        }

        setIsScanning(false);
      }
    }
    initDevice();
  }, []);

  // Re-initialize slots when mode changes
  const handleModeChange = (newMode: EditingMode) => {
    setMode(newMode);
    setSlots(createInitialSlots(newMode));
  };

  // Re-calculate BGM assignments whenever slots or clips change
  const updateBgmAssignments = useCallback((currentSlots: ClipSlot[], catalog: BgmTrack[]) => {
    if (catalog.length === 0) {
      return currentSlots.map((s) => ({
        ...s,
        assignedBgm: null,
        bgmAlternatives: []
      }));
    }

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

  // Initialize BGM assignments on catalog changes
  useEffect(() => {
    setSlots((prev) => updateBgmAssignments(prev, bgmTracks));
  }, [updateBgmAssignments, bgmTracks]);

  // Full rescan trigger
  const handleRefreshRecordings = async () => {
    setIsScanning(true);
    if (isNativeAndroid) {
      const [recs, tracks] = await Promise.all([
        autoScanRecordings('/sdcard/DCIM/ScreenRecorder'),
        autoScanMusic('/sdcard/Music')
      ]);
      if (recs && recs.length > 0) {
        setRecordings(recs);
      }
      if (tracks && tracks.length > 0) {
        setBgmTracks(tracks);
      }
      const shizukuStatus = await checkAndRequestShizuku();
      setShizukuActive(shizukuStatus.isRunning && shizukuStatus.isGranted);
    }
    setIsScanning(false);
  };

  // Add newly imported real video recordings
  const handleAddRecordings = (newItems: RawRecording[]) => {
    setRecordings((prev) => {
      const existingIds = new Set(prev.map((r) => r.filename));
      const filtered = newItems.filter((item) => !existingIds.has(item.filename));
      return [...filtered, ...prev];
    });
  };

  // Delete a recording
  const handleDeleteRecording = (id: string) => {
    setRecordings((prev) => prev.filter((r) => r.id !== id));
    setSlots((prev) =>
      prev.map((s) =>
        s.assignedClip?.id === id ? { ...s, assignedClip: null, effectiveCombatSec: 0 } : s
      )
    );
  };

  // Add newly imported real BGM tracks
  const handleAddTracks = (newItems: BgmTrack[]) => {
    setBgmTracks((prev) => {
      const existingTitles = new Set(prev.map((t) => t.title));
      const filtered = newItems.filter((item) => !existingTitles.has(item.title));
      const combined = [...prev, ...filtered];
      setSlots((sPrev) => updateBgmAssignments(sPrev, combined));
      return combined;
    });
  };

  // Delete a BGM track
  const handleDeleteTrack = (id: string) => {
    setBgmTracks((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      setSlots((sPrev) => updateBgmAssignments(sPrev, updated));
      return updated;
    });
  };

  const filledCount = slots.filter((s) => s.assignedClip).length;

  return (
    <div className="min-h-screen bg-[#080B10] text-slate-100 flex flex-col max-w-md mx-auto relative shadow-2xl">
      {/* Top Mobile Header */}
      <TopHeader
        shizukuActive={shizukuActive}
        onToggleShizuku={async () => {
          if (isNativeAndroid) {
            const status = await checkAndRequestShizuku();
            setShizukuActive(status.isRunning && status.isGranted);
          } else {
            setShizukuActive(!shizukuActive);
          }
        }}
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
            onAddRecordings={handleAddRecordings}
            onRefreshRecordings={handleRefreshRecordings}
            isScanning={isScanning}
            shizukuActive={shizukuActive}
          />
        )}

        {activeTab === 'bgm' && (
          <BgmManagerView
            tracks={bgmTracks}
            onAddTracks={handleAddTracks}
            onDeleteTrack={handleDeleteTrack}
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

      {/* 2712x1220 30fps Video Assembly Modal */}
      {isRenderModalOpen && (
        <RenderModal
          slots={slots}
          onClose={() => setIsRenderModalOpen(false)}
          shizukuActive={shizukuActive}
        />
      )}
    </div>
  );
}
