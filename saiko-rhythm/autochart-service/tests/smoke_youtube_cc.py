"""Optional real-world verification on a CC BY Blender Foundation film.

This script must be launched explicitly in private test CI. It performs one
YouTube download, does not publish/share media, then removes temporary files.
Big Buck Bunny is published by Blender Foundation under CC BY 3.0
(see https://peach.blender.org/about/). YouTube platform terms still apply.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app import _chart_for_video

VIDEO_ID="YE7VzlLtp-4"  # Big Buck Bunny (Blender Foundation, Creative Commons)
chart=_chart_for_video(VIDEO_ID,"normal")
notes=chart["notes"]
if len(notes)<20: raise SystemExit(f"Too few real waveform onsets: {len(notes)}")
if any(not (0<=n["t"]<=chart["duration"] and 0<=n["lane"]<4) for n in notes):
 raise SystemExit("Invalid onset timestamps")
if any(notes[i]["t"]>=notes[i+1]["t"] for i in range(len(notes)-1)):
 raise SystemExit("Notes are not increasing")
print(json.dumps({"video_id":VIDEO_ID,"source":chart["source"],"duration":chart["duration"],
 "note_count":len(notes),"first_notes":notes[:6]},ensure_ascii=False))
print("PASS: real-world CC BY YouTube sample -> temporary audio -> valid playable note timestamps")
