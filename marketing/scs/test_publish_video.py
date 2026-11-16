import datetime as dt
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import buffer_publish_video as pub
import produce_video as video

class Journal:
    def __init__(self,data=None):self.data=data or {'days':{}};self.saved=[]
    def save(self):
        import copy
        self.saved.append(copy.deepcopy(self.data))

class PublishTests(unittest.TestCase):
    def setUp(self):
        self.gate=patch.object(pub,'ensure_review',return_value=True)
        self.gate.start();self.addCleanup(self.gate.stop)

    def test_failed_review_prevents_all_publication_mutations(self):
        plan=video.make_plan('2026-11-16')
        record={'plan':plan,'video_url':'https://example.com/base.mp4','services':{}}
        with patch.object(pub,'ensure_review',return_value=False), patch.object(pub,'posts_for',return_value=[]), patch.object(pub,'mutation') as mutate:
            failures=pub.process(Journal({'days':{'2026-11-16':record}}),'2026-11-16',{'youtube':{'id':pub.CHANNELS['youtube']}})
            self.assertTrue(failures);mutate.assert_not_called()

    def test_approval_bound_to_file_and_all_thresholds(self):
        from review_video import approved, CATEGORIES
        r={'version':1,'sha256':'abc','status':'approved','decision':'pass','issues':[],'scores':{k:90 for k in CATEGORIES}}
        self.assertTrue(approved(r,'abc'))
        self.assertFalse(approved(r,'changed'))
        r['scores']['readability']=84
        self.assertFalse(approved(r,'abc'))
        r['scores']['readability']=90;r['issues']=['文字欠け']
        self.assertFalse(approved(r,'abc'))

    def test_exact_destinations_and_metadata(self):
        p=video.make_plan('2026-11-15')
        for s in pub.CHANNELS:
            value=pub.create_input(p,s,'https://example.com/base.mp4')
            self.assertEqual(value['channelId'],pub.CHANNELS[s])
            self.assertEqual(value['mode'],'shareNow')
            self.assertFalse(value['needsApproval'])
            self.assertIn(s,value['metadata'])
        self.assertEqual(pub.create_input(p,'youtube','x')['metadata']['youtube']['privacy'],'public')
    def test_all_rotation_captions_fit(self):
        for i in range(72):
            p=video.make_plan((dt.date(2026,11,15)+dt.timedelta(days=i)).isoformat())
            for s in p['scenes']:
                self.assertLessEqual(len(video.wrap(s['voice'],39,860)),5)
                self.assertLessEqual(len(video.wrap(s['headline'],62,900)),4)
    def test_ambiguous_create_is_not_retried(self):
        journal=Journal();channels={s:{'id':cid} for s,cid in pub.CHANNELS.items()}
        journal.data['days']['2026-11-15']={'plan':video.make_plan('2026-11-15'),'video_url':'https://example.com/base.mp4','services':{}}
        with patch.object(pub,'posts_for',return_value=[]),patch.object(pub,'mutation',side_effect=pub.Ambiguous('timeout')) as mutation,patch.dict(os.environ,{'BASE_POLL_ATTEMPTS':'0'}):
            pub.process(journal,'2026-11-15',channels)
            self.assertEqual(mutation.call_count,3)
            for s in channels:self.assertTrue(any(x['days']['2026-11-15']['services'].get(s,{}).get('state')=='creating' for x in journal.saved))
            pub.process(journal,'2026-11-15',channels)
            self.assertEqual(mutation.call_count,3)
    def test_existing_remote_post_prevents_duplicate(self):
        p=video.make_plan('2026-11-15');post={'id':'existing','text':p['caption'],'status':'sent','externalLink':'https://example.com/post'}
        channels={s:{'id':cid} for s,cid in pub.CHANNELS.items()}
        with patch.object(pub,'posts_for',return_value=[post]),patch.object(pub,'mutation') as mutation,patch('produce_video.produce') as render,patch.dict(os.environ,{'BASE_POLL_ATTEMPTS':'0'}):
            self.assertEqual(pub.process(Journal(),'2026-11-15',channels),[])
            mutation.assert_not_called();render.assert_not_called()
    def test_failed_post_retry_same_id_and_limit(self):
        p={'id':'original','status':'error'}
        self.assertTrue(pub.eligible_retry({},p))
        self.assertFalse(pub.eligible_retry({'retries':3},p))
        self.assertFalse(pub.eligible_retry({'last_attempt':pub.now()},p))
        self.assertFalse(pub.eligible_retry({},dict(p,status='sent')))
    def test_error_resubmission_edits_same_post(self):
        plan=video.make_plan('2026-11-15')
        post={'id':'original','text':plan['caption'],'status':'error','externalLink':None}
        sent=dict(post,status='sent')
        journal=Journal({'days':{'2026-11-15':{'plan':plan,'services':{'youtube':{'state':'error','post':post}}}}})
        with patch.object(pub,'posts_for',return_value=[post]),patch.object(pub,'mutation',return_value=sent) as mutate,patch.dict(os.environ,{'BASE_POLL_ATTEMPTS':'0'}):
            pub.process(journal,'2026-11-15',{'youtube':{'id':pub.CHANNELS['youtube']}})
            mutate.assert_called_once_with('editPost',{'id':'original','mode':'shareNow','schedulingType':'automatic','saveToDraft':False})
    def test_lookalike_wrong_channel_id_is_rejected(self):
        channels=[{'id':'WRONG','service':s,'name':'岩国BASE 店舗・事業者相談' if s=='youtube' else 'base_iwakuni'} for s in pub.CHANNELS]
        with patch.object(pub,'gql',side_effect=[{'account':{'organizations':[{'id':'org'}]}},{'channels':channels}]):
            with self.assertRaisesRegex(RuntimeError,'ID mismatch'): pub.verify()
    def test_duplicate_marker_fails_closed(self):
        with self.assertRaises(RuntimeError):pub.matching([{'text':'#marker'},{'text':'#marker'}],'#marker')

if __name__=='__main__':unittest.main()
