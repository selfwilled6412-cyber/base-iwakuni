"""Private experimental YouTube-url -> rhythm chart gateway.

Requirements: python 3.11+, yt-dlp, FFmpeg/ffprobe, numpy, FastAPI, Uvicorn.
This is a LOCAL/private prototype, not a publicly deployed application. Audio
is decoded only in temporary storage and deleted immediately after processing.
No audio is returned to the browser, cached or saved.

Important: extracting YouTube content without approval can breach YouTube's
terms; rights to use a recording in a commercial rhythm game are separate.
Do not deploy this as an open public relay without a compliance/security review.
"""
from __future__ import annotations

import os
import re
import secrets
import sys
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from analyzer import SAMPLE_RATE, make_chart

VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
MAX_FILE_BYTES = 32 * 1024 * 1024
# Only one expensive operation at a time on the intended local machine.
BUSY = threading.Lock()

app = FastAPI(title="SAIKO BEAT private automatic chart gateway", docs_url=None, redoc_url=None)
origins = [
    "https://selfwilled6412-cyber.github.io",
    "http://localhost:8766",
    "http://127.0.0.1:8766",
]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["POST", "GET"], allow_headers=["Content-Type", "X-Chart-Key"])
# On Windows PC, serve the prototype and API from the same local origin.
# This avoids cross-origin localhost/mixed-content and exposes no credentials.
if os.environ.get("SAIKO_LOCAL_GAME", "1") == "1":
    public_game_dir = Path(__file__).resolve().parent.parent
    if public_game_dir.joinpath("youtube.html").is_file():
        app.mount("/game", StaticFiles(directory=public_game_dir, html=True), name="local-game")



class ChartRequest(BaseModel):
    video_id: str = Field(min_length=11, max_length=11)
    level: str = "normal"


def _checked_commands() -> None:
    if not shutil.which("yt-dlp"):
        raise HTTPException(status_code=503, detail="yt-dlp is not installed")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise HTTPException(status_code=503, detail="FFmpeg and ffprobe are required")


def _run(args: list[str], *, timeout: int) -> bytes:
    try:
        done = subprocess.run(args, check=False, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=timeout)
    except subprocess.TimeoutExpired as error:
        raise HTTPException(status_code=504, detail="Audio analysis timed out") from error
    if done.returncode != 0:
        # Only explicit private CI diagnostics can print a REDACTED tool error.
        # Never return YouTube's raw response or signed stream URLs to a client.
        if os.environ.get("SAIKO_CHART_DIAGNOSTICS") == "1" and args and args[0] == "yt-dlp":
            lines=done.stderr.decode(errors="replace").splitlines()[-10:]
            for line in lines:
                line=re.sub(r"https?://\\S+", "[URL]", line)
                print("[YT-DLP DIAG]", line[:250], file=sys.stderr)
        raise HTTPException(status_code=422, detail="Could not process this video. It may be unavailable or restricted")
    return done.stdout


def _chart_for_video(video_id: str, level: str) -> dict:
    if not VIDEO_ID.fullmatch(video_id) or level not in {"easy", "normal", "hard"}:
        raise HTTPException(status_code=400, detail="Invalid video or level")
    _checked_commands()
    with tempfile.TemporaryDirectory(prefix="saiko-chart-") as directory:
        temp = Path(directory)
        # A strict known host and validated ID prevent arbitrary remote URL access.
        url = "https://www.youtube.com/watch?v=" + video_id
        template = str(temp / "audio.%(ext)s")
        _run([
            "yt-dlp", "--no-playlist", "--no-progress", "--no-warnings",
            "--no-cache-dir", "--no-write-info-json", "--no-write-thumbnail",
            "--max-filesize", "32M", "--match-filter", "duration <= 600",
            "--retries", "1", "--fragment-retries", "1",
            "-f", "bestaudio[ext=m4a]/bestaudio",
            "-o", template, "--", url,
        ], timeout=110)
        files = [p for p in temp.iterdir() if p.is_file()]
        if len(files) != 1 or files[0].stat().st_size > MAX_FILE_BYTES:
            raise HTTPException(status_code=422, detail="Unsupported or oversized recording")
        media = str(files[0])
        info = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "default=noprint_wrappers=1:nokey=1", media], timeout=12)
        try:
            seconds = float(info.decode().strip())
        except (ValueError, UnicodeError):
            raise HTTPException(status_code=422, detail="Could not measure track duration")
        if not 5 <= seconds <= 600:
            raise HTTPException(status_code=422, detail="Only tracks between 5 seconds and 10 minutes are supported")
        pcm_bytes = _run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-i", media,
                          "-t", "600", "-vn", "-ac", "1", "-ar", str(SAMPLE_RATE),
                          "-f", "f32le", "-acodec", "pcm_f32le", "pipe:1"], timeout=50)
        if len(pcm_bytes) > int(600 * SAMPLE_RATE * 4) + 65536 or not pcm_bytes:
            raise HTTPException(status_code=422, detail="Could not decode audio")
        pcm = np.frombuffer(pcm_bytes, dtype="<f4")
        try:
            chart = make_chart(pcm, SAMPLE_RATE, level)
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        return chart


@app.get("/health")
def health() -> dict:
    return {"ok": True, "private_prototype": True, "audio_processing": "temporary_only"}


@app.post("/api/chart")
def chart(request: ChartRequest, http: Request) -> dict:
    api_key = os.environ.get("SAIKO_CHART_API_KEY", "")
    # Fail closed if accidentally exposed through uvicorn/gunicorn rather than
    # the guarded __main__ path. Loopback alone is allowed for local demos.
    peer_host = (http.client.host if http.client else "") or ""
    if not api_key and peer_host not in {"127.0.0.1", "::1"}:
        raise HTTPException(status_code=503, detail="Private gateway requires a service key")
    if api_key and not secrets.compare_digest(http.headers.get("X-Chart-Key", ""), api_key):
        raise HTTPException(status_code=401, detail="Invalid chart service key")
    if not BUSY.acquire(blocking=False):
        raise HTTPException(status_code=429, detail="Analysis in progress. Retry after it finishes")
    try:
        result = _chart_for_video(request.video_id, request.level)
        return {"video_id": request.video_id, **result}
    finally:
        BUSY.release()


if __name__ == "__main__":
    import uvicorn
    host = os.environ.get("SAIKO_CHART_BIND", "127.0.0.1")
    if host != "127.0.0.1" and not os.environ.get("SAIKO_CHART_API_KEY"):
        raise SystemExit("Non-loopback binding requires SAIKO_CHART_API_KEY")
    uvicorn.run(app, host=host, port=int(os.environ.get("SAIKO_CHART_PORT", "8766")))
