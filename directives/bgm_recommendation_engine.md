# BGM Recommendation Engine Directive
<!-- DOE-VERSION: 2026.09.17 -->

## Goal
Select and match optimal soundtrack tracks to combat chambers and outro segments using multi-criteria duration fitness, energy pacing, canonical track hashing, and explainable recommendations.

## Trigger Phrases
- "recommend bgm"
- "match audio duration"
- "generate soundtrack suite"
- "index music library"

## Quick Start
```bash
python execution/music_recommender.py --durations 95.0 110.0 85.0 --builds 90.0
python -m pytest tests/test_creator_enhancements.py
```

## What It Does
1. **Canonical Track Hashing**:
   - Resolves file paths to lowercase, forward-slash normalized strings before computing SHA-256 hashes (`get_track_canonical_id`).
   - Ensures cross-platform consistency between Windows backslashes and Linux forward slashes with zero duplicate tracks.
2. **Multi-Criteria Scoring**:
   - Matches track durations to fight lengths with ideal positive margins (+0s to +4.5s).
   - Dynamically calculates drop in-points for long tracks without cutting into combat length.
   - Applies energy weights (`high` combat pacing for early chambers, `chill` outro for showcase builds).
   - Enforces strict anti-repetition across all chambers in a single run.
3. **Explainable Recommendation Metadata**:
   - Attaches structured `explanation` badges to every selected track and alternative (`duration_margin_sec`, `energy_match`, `duplicate_in_run`, `rationale`).
   - Displays clear reason cards in the creator UI.

## Output
- 4-track synchronized BGM suite (`chamber_1`, `chamber_2`, `chamber_3`, `builds`).
- Audition swap list with top 15 alternatives per slot.
