# Android Auto-Editor (Genshin Abyss Studio Mobile)

A high-performance, mobile-native post-production studio for Genshin Impact endgame creators (Floor 12 and Stygian Onslaught). Transforms raw screen recordings into a finalized 1080p 60fps MP4 with automated loading-screen trimming, duration-matched background music scoring, 0.5s black fade transitions, YouTube chapter metadata, and an interactive 1080p touch thumbnail studio.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Workflow & Technical Decisions**
> - **Primary Output**: A ready-to-upload **finalized 1080p 60fps MP4 video** exported directly to `/sdcard/DCIM/GenshinAbyssStudio/`, bypassing the need for third-party mobile editors.
> - **Device Target**: **Xiaomi 13T Pro** running HyperOS with MediaTek Dimensity 9200+ (4nm), Immortalis-G715 GPU, hardware dual-VPU encoding, and 12GB+ LPDDR5X RAM.
> - **In-Game Audio Configuration**: Clip audio consists purely of **in-game SFX and character voicelines** (in-game Music volume set to 0%).
> - **Audio Balancing & Normalization**: Clip SFX/voice track normalized to **-20.0 dB** (gain factor `0.10`); auto-selected BGM normalized to **-30.0 dB** (gain factor `0.0316`) with smooth **1.5s exponential fade-outs** at chamber victory cuts. No intrusive voice-ducking required.
> - **Transitions**: Standardized **0.5s Black Fade** between chambers and boss battlefields.
> - **Clip Ingestion & Shizuku**: Ingestion occurs **on app open or manual pull-to-refresh** (rather than continuous background auto-snatching) so creators can discard failed takes before assembly. Shizuku's ADB daemon provides instant, permissionless read access to `/sdcard/DCIM/ScreenRecorder/` and `/sdcard/Music/` with high foreground process priority to avoid HyperOS task-killing.
> - **All 3 Editing Modes Supported**: Full parity with the PC engine across **Basic Floor 12 (4 clips)**, **Inverse Dual Showcase (7–8 clips / 2 drafts)**, and **Stygian Onslaught (4 clips / 4 BGM topologies)**.
> - **Form Factor**: **Portrait-first** ergonomic mobile interface with thumb-zone slot cards, micro-scrubbers, bottom sheets, and responsive touch canvas.

---

## 1. Overview & Core Concept

### What It Does
Android Auto-Editor eliminates the multi-app bottleneck on mobile. A creator records Abyss chambers or Stygian boss encounters using the built-in Xiaomi Screen Recorder. Opening the app:
1. Instantly scans and clusters recent takes.
2. Identifies and trims entry loading screens and victory freeze frames.
3. Recursively scans the creator's `/sdcard/Music/` library, matches optimal high-energy BGM tracks per chamber with zero duplicates, and assigns chill outro music to character builds.
4. Synthesizes a 1080p 60fps MP4 in ~30 seconds using hardware `MediaCodec`.
5. Copies formatted YouTube chapter timestamps and song credits to the clipboard.
6. Provides a touch-first 1080p thumbnail studio with HoYoWiki character art, divider styles, and challenge badges.

### Target Persona
Mobile Genshin Impact content creators and speedrunners who capture gameplay on high-refresh Android devices and want to publish polished showcase videos to YouTube and TikTok without transferring gigabytes of footage to a PC.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Record Gameplay in Genshin]
           │
           ▼
[Open Android Auto-Editor]
           │
           ├─► Auto-scans DCIM/ScreenRecorder & /sdcard/Music
           │
           ▼
[1. Review & Slot Assignment]
  • Failed attempts flagged (<30s) -> 1-tap delete from storage
  • Winning takes assigned to slots (Chamber 12-1, 12-2, 12-3, Builds)
  • 3-second micro-scrubber to verify 3-star victory freeze
           │
           ▼
[2. BGM Review & Swap]
  • Displays assigned tracks per chamber (-30 dB gain, zero duplicates)
  • Quick "Swap" button cycles top-3 duration-matched alternatives
           │
           ▼
[3. One-Tap Render & Export]
  • Hardware Media3 engine renders 1080p 60fps MP4 in ~30s
  • Saves to DCIM/GenshinAbyssStudio/
  • Copies YouTube chapters + BGM credits to clipboard
  • Opens YouTube Studio app trigger
           │
           ▼
[4. 1080p Thumbnail Studio Tab]
  • Two-finger pinch/zoom & pan character art
  • Element filter drawer (Pyro, Hydro, Anemo, etc.)
  • Draggable text stamps (C0, SOLO, F12) with haptic snap
  • 1-tap 1080p lossless PNG export to gallery
```

### Visual Identity & Theme
- **Aesthetic Direction**: Tactical Dark Cyber-Abyss. Clean, functional, and authoritative. Deep obsidian surfaces with luminous gold (`#FED662`) and celestia-cyan (`#00E5FF`) accents matching Genshin's endgame UI.
- **Palette**:
  - Canvas / Background: Deep Obsidian (`#0B0E14`)
  - Structural Cards & Surfaces: Dark Charcoal Slate (`#151A23`) with hairline borders (`#232B38`)
  - Primary Accent: Spire Gold (`#FED662`)
  - Secondary Accent: Celestia Cyan (`#00E5FF`)
  - Warning / Danger: Abyssal Crimson (`#FF4D4D`)
- **Typography & Hierarchy**:
  - Headings / Badges: Condensed athletic sans (`Anton`, `Bebas Neue`, `Montserrat-Black`) for high-impact stamps.
  - Body & Metadata: Neo-grotesque sans (`Plus Jakarta Sans` / `Manrope`) with tabular numbers (`tabular-nums`) for timestamps, durations, and decibel levels.
- **Thumb-Zone Ergonomics**:
  - Fixed Bottom Navigation Bar ($56\text{px}$ height, $\le 15\%$ viewport cap) with 3 primary destinations: *Arranger*, *Thumbnail*, *BGM Library*.
  - Floating Primary CTA: Sticky bottom-anchored "Render 1080p MP4" button with tactile press feedback.
  - Interactive hitboxes: All slot selectors, swap triggers, and scrubber handles exceed $48 \times 48\text{px}$.

---

## 3. Key Product Decisions & Trade-Offs

### Decision 1: In-App Media3 Hardware Pipeline vs External CapCut Mobile Injection
- **Chosen Approach**: Build a self-contained in-app assembly pipeline powered by **Android Jetpack Media3 (Transformer API)** and hardware `MediaCodec`. Include an optional "Push to CapCut via Shizuku" toggle for users who desire external mobile draft editing.
- **Why**: Android Scoped Storage completely locks down `Android/data/com.lemon.lvoverseas/`. While Shizuku can bypass this, relying solely on CapCut mobile makes the creator dependent on fragile third-party schema formats. An in-app renderer gives guaranteed, 1-tap MP4 output directly to the gallery in ~30s.
- **Trade-Off**: Requires implementing the timeline concatenation and audio crossfader inside the app, which is fully supported by Media3 Transformer on modern Android.

### Decision 2: Manual Scan / Pull-to-Refresh vs Continuous Background File Watcher
- **Chosen Approach**: Scan `/sdcard/DCIM/ScreenRecorder/` on app launch or manual pull-to-refresh button.
- **Why**: High-difficulty Abyss and Stygian runs involve frequent retries and aborted takes. Continuous file watchers flood the workspace with junk clips. Batch scanning on launch allows the creator to triage runs, discard failed attempts, and lock the winning takes into their respective slots.

### Decision 3: Recursive Music Scanner with Directory Heuristics
- **Chosen Approach**: Recursively index `/sdcard/Music/**`, reading ID3 tags and subfolder names. Subfolders containing keywords (`Combat`, `Abyss`, `Boss`) receive high-energy priority; subfolders containing `Chill`, `Lo-Fi`, or `Ambient` are designated for the Character Builds outro.
- **Why**: Creators naturally group their music in categorized subfolders. Reading directory cues eliminates the need for manual per-track tagging on mobile.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ANDROID AUTO-EDITOR APP                         │
│                                                                        │
│  ┌───────────────────────┐  ┌───────────────────┐  ┌────────────────┐  │
│  │ Touch Thumbnail Canvas│  │  Video Arranger   │  │ BGM Auto-Score │  │
│  │ (Canvas 2D / Skia)    │  │ (Slot Cards / CV) │  │ (Topologies)   │  │
│  └───────────────────────┘  └───────────────────┘  └────────────────┘  │
│                                      │                                 │
│                 ┌────────────────────┴───────────────────┐             │
│                 ▼                                        ▼             │
│  ┌──────────────────────────────┐       ┌────────────────────────────┐ │
│  │   Computer Vision Trimmer    │       │     Shizuku ADB Bridge     │ │
│  │   (MediaExtractor / OpenCV)  │       │     (Rikka Shizuku API)    │ │
│  │   - Entry Load Cut (Luma/RGB)│       │     - Direct DCIM Access   │ │
│  │   - Mid-Chamber Intermission │       │     - Foreground Task Lock │ │
│  │   - Tail Victory Cut (+2.0s) │       │     - CapCut Draft Push    │ │
│  └──────────────┬───────────────┘       └──────────────┬─────────────┘ │
│                 │                                      │               │
│                 ▼                                      │               │
│  ┌──────────────────────────────────────────────────┐  │               │
│  │       Jetpack Media3 Transformer Engine          │  │               │
│  │       - Dimensity 9200+ Hardware VPU MediaCodec  │  │               │
│  │       - 0.5s Black Fade Video Compositor         │  │               │
│  │       - Dual-Track Audio Mixer (SFX + BGM)       │  │               │
│  │       - Volume Normalization (-20dB / -30dB)     │  │               │
│  │       - 1.5s Exponential Victory Fade-Out        │  │               │
│  └──────────────────────┬───────────────────────────┘  │               │
│                         │                              │               │
│                         ▼                              ▼               │
│             /DCIM/GenshinAbyssStudio/         /Android/data/CapCut/    │
│             Rendered 1080p 60fps MP4          draft_content.json (opt) │
└────────────────────────────────────────────────────────────────────────┘
```

### Video Cut & Audio Mixing Math

1. **Video Cut Detection**:
   - `detect_entry_cut(clip)`: Samples 1 keyframe every 0.25s. When average frame luminance rises above black threshold and domain gate vanishes, captures the 3-2-1 countdown onset ($t_{\text{start}}$).
   - `detect_chamber_intermission(clip)`: Detects the 2–4s elevator/keycard transition between Side 1 and Side 2, segmenting the single chamber clip into two combat halves.
   - `detect_tail_cut(clip)`: Detects the 3-star victory banner or Stygian "Time Elapsed" screen, adding a $+1.5\text{s}$ (Abyss) or $+2.0\text{s}$ (Stygian) hold before cutting.
2. **Audio Mixing Matrix**:
   $$A_{\text{out}}(t) = G_{\text{clip}} \cdot S_{\text{SFX}}(t) + G_{\text{BGM}} \cdot S_{\text{BGM}}(t) \cdot F(t)$$
   - $G_{\text{clip}} = 0.10$ ($-20.0\text{ dB}$, ensures combat dialogue and elemental bursts remain prominent).
   - $G_{\text{BGM}} = 0.0316$ ($-30.0\text{ dB}$, sits cleanly under combat audio).
   - $F(t) = \text{FadeEnvelope}(t)$: $0.1\text{s}$ linear attack at start; $1.5\text{s}$ exponential decay at chamber completion.

### State & Persistence
- **Active Run State**:
  - `mode`: `'basic'` | `'showcase'` | `'stygian'`
  - `slots`: Array of clip file paths, metadata, trim points, and assigned BGM tracks.
  - `stygianTopology`: `'topology_2x2'` | `'topology_continuous'` | `'topology_per_boss'` | `'topology_unified_combat'`
  - `history`: Undo/redo stack (40 steps).
- **Persistent Project Storage**: Stored as JSON (`.abyss` mobile format) under app-private storage, with 1-tap export/import to share across devices.
