"""Offline contract tests: never contact YouTube or download protected works."""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from analyzer import SAMPLE_RATE, detect_beats, make_chart
import app


def synthetic_track(seconds: int = 12) -> np.ndarray:
    sr = SAMPLE_RATE
    samples = np.zeros(sr * seconds, dtype=np.float32)
    starts = [0.5 + i * .5 for i in range(int((seconds - 1) / .5))]
    for pos in starts:
        start = int(pos * sr)
        duration = int(.11 * sr)
        x = np.arange(duration)
        samples[start:start + duration] = (
            .7 * np.exp(-x / (sr * .018)) * np.sin(2 * np.pi * 220 * x / sr)
        ).astype(np.float32)
    return samples


class AnalyzerTests(unittest.TestCase):
    def test_onsets_follow_actual_audio(self):
        samples = synthetic_track()
        beats = detect_beats(samples)
        self.assertGreaterEqual(len(beats), 10)
        recorded = [b.time for b in beats]
        expected = [.5 + i * .5 for i in range(21)]
        close = sum(any(abs(t - e) < .13 for t in recorded) for e in expected)
        self.assertGreaterEqual(close, 10, "Onsets should follow the sampled transients")
        self.assertTrue(all(0 <= b.lane < 4 for b in beats))

    def test_no_invented_beats_for_silence(self):
        self.assertEqual(detect_beats(np.zeros(SAMPLE_RATE * 12, dtype=np.float32)), [])
        with self.assertRaises(ValueError):
            make_chart(np.zeros(SAMPLE_RATE * 12, dtype=np.float32))

    def test_all_difficulties(self):
        samples = synthetic_track()
        counts = {}
        for level in ["easy", "normal", "hard"]:
            chart = make_chart(samples, level=level)
            self.assertTrue(all(0 <= n["t"] <= 12 for n in chart["notes"]))
            self.assertEqual(chart["note_count"], len(chart["notes"]))
            counts[level] = chart["note_count"]
        self.assertLessEqual(counts["easy"], counts["hard"])

    def test_time_bounds(self):
        with self.assertRaises(ValueError):
            detect_beats(np.zeros(SAMPLE_RATE * 3, dtype=np.float32))
        with self.assertRaises(ValueError):
            detect_beats(np.full(SAMPLE_RATE * 12, np.nan, dtype=np.float32))

    def test_localhost_serves_game_without_asking_for_external_host(self):
        from fastapi.testclient import TestClient
        with TestClient(app.app, client=("127.0.0.1", 44001)) as client:
            page = client.get("/game/youtube.html")
            self.assertEqual(page.status_code, 200)
            self.assertIn('id="autoChart"', page.text)
            js = client.get("/game/youtube.js")
            self.assertEqual(js.status_code, 200)
            self.assertIn("gatewayBase", js.text)
            with patch.object(app, "_chart_for_video", return_value={
                "duration": 12.0, "notes": [{"t": 1.2, "lane": 0}, {"t": 1.6, "lane": 1}]
            }):
                response = client.post("/api/chart", json={"video_id": "YE7VzlLtp-4", "level": "normal"})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["video_id"], "YE7VzlLtp-4")
                self.assertEqual(response.json()["notes"][0]["t"], 1.2)

    def test_youtube_bot_block_is_reported_without_leaking_stream_urls(self):
        from fastapi import HTTPException
        blocked=SimpleNamespace(returncode=1,stdout=b"",stderr=b"ERROR: Sign in to confirm you're not a bot. [URL] private token")
        with patch.object(app.subprocess, "run", return_value=blocked):
            with self.assertRaises(HTTPException) as error:
                app._run(["yt-dlp", "--", "https://www.youtube.com/watch?v=YE7VzlLtp-4"], timeout=10)
        self.assertEqual(error.exception.status_code,403)
        self.assertIn("bot verification",error.exception.detail)
        self.assertNotIn("token",error.exception.detail)

    def test_video_id_validation_happens_before_extracting(self):
        with self.assertRaises(Exception):
            app._chart_for_video("localhost:80", "normal")
        with self.assertRaises(Exception):
            app._chart_for_video("dQw4w9WgXcQ", "malicious")
        self.assertTrue(app.VIDEO_ID.fullmatch("dQw4w9WgXcQ"))

    def test_end_to_end_without_network(self):
        samples = synthetic_track()
        ffmpeg_output = samples.astype("<f4").tobytes()
        def mocked(args, *, timeout):
            if args[0] == "yt-dlp":
                template = args[args.index("-o") + 1]
                Path(template.replace("%(ext)s", "m4a")).write_bytes(b"FAKE PRIVATE TEST RECORDING")
                return b""
            if args[0] == "ffprobe":
                return b"12.0\n"
            if args[0] == "ffmpeg":
                return ffmpeg_output
            raise AssertionError(args)
        with patch.object(app, "_checked_commands", lambda: None), patch.object(app, "_run", mocked):
            chart = app._chart_for_video("dQw4w9WgXcQ", "normal")
        self.assertGreaterEqual(len(chart["notes"]), 10)
        self.assertEqual(chart["source"], "decoded-audio-transients")

    def test_private_gateway_rejects_unauthenticated_public_clients(self):
        from fastapi import HTTPException
        req = app.ChartRequest(video_id="dQw4w9WgXcQ", level="normal")
        public = SimpleNamespace(client=SimpleNamespace(host="203.0.113.10"), headers={})
        local = SimpleNamespace(client=SimpleNamespace(host="127.0.0.1"), headers={})
        with patch.dict("os.environ", {"SAIKO_CHART_API_KEY": ""}):
            with self.assertRaises(HTTPException) as failure:
                app.chart(req, public)
            self.assertEqual(failure.exception.status_code, 503)
            with patch.object(app, "_chart_for_video", return_value={"notes": [{"t": 1.2, "lane": 0}]}):
                self.assertEqual(app.chart(req, local)["video_id"], "dQw4w9WgXcQ")
        with patch.dict("os.environ", {"SAIKO_CHART_API_KEY": "long-test-secret"}):
            with self.assertRaises(HTTPException) as failure:
                app.chart(req, public)
            self.assertEqual(failure.exception.status_code, 401)
            authed = SimpleNamespace(client=public.client, headers={"X-Chart-Key": "long-test-secret"})
            with patch.object(app, "_chart_for_video", return_value={"notes": [{"t": 2, "lane": 1}]}):
                self.assertEqual(app.chart(req, authed)["video_id"], "dQw4w9WgXcQ")


if __name__ == "__main__":
    unittest.main()
