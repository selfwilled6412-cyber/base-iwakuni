"""Offline smoke test: cinematic editor never calls any social or paid API."""
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from cinematic_cut import render


class TestCinematicCut(unittest.TestCase):
    def test_reject_one_static_scene(self):
        with self.assertRaisesRegex(ValueError, 'three'):
            render(['still.png'], 'voice.wav', 'output.mp4')

    @unittest.skipUnless(shutil.which('ffmpeg') and shutil.which('ffprobe'),
                         'Requires FFmpeg')
    def test_three_moving_shots_and_audio(self):
        with tempfile.TemporaryDirectory(prefix='base-ad-test-') as root:
            directory=Path(root)
            clips=[]
            for n in range(3):
                clip=directory/f'shot{n}.mp4'
                subprocess.run(['ffmpeg','-nostdin','-v','error','-y',
                    '-f','lavfi','-i',f'testsrc2=size=180x320:rate=12',
                    '-t','2.5','-c:v','libx264','-preset','ultrafast',
                    str(clip)], check=True)
                clips.append(str(clip))
            sound=directory/'voice.wav'
            subprocess.run(['ffmpeg','-nostdin','-v','error','-y',
                '-f','lavfi','-i','sine=frequency=220:sample_rate=24000',
                '-t','8','-c:a','pcm_s16le',str(sound)],check=True)
            output=directory/'ad.mp4'
            report=render(clips,str(sound),str(output),
                          size=(270,480),seconds_per_clip=2,cta_seconds=2)
            self.assertEqual(report['video_shots'],3)
            self.assertEqual(report['duration'],8)
            self.assertTrue(output.stat().st_size>10000)
            self.assertEqual(report['brand'],'株式会社BASE')
            self.assertTrue(report['prototype_only'])


if __name__=='__main__':
    unittest.main()
