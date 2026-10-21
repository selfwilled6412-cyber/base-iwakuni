import base64
import hashlib
import hmac
import json
import unittest

from line_webhook_receiver import handle_webhook, verify_line_signature


SECRET = "test-secret"


def sign(body: bytes) -> str:
    digest = hmac.new(SECRET.encode(), body, hashlib.sha256).digest()
    return base64.b64encode(digest).decode()


class LineWebhookReceiverTests(unittest.TestCase):
    def test_signature(self):
        body = b'{"events":[]}'
        self.assertTrue(verify_line_signature(body, sign(body), SECRET))
        self.assertFalse(verify_line_signature(body, "bad", SECRET))

    def test_extracts_text_only(self):
        payload = {
            "events": [
                {
                    "type": "message",
                    "webhookEventId": "evt-1",
                    "timestamp": 123,
                    "source": {"userId": "U-test"},
                    "message": {"id": "m1", "type": "text", "text": "自動化相談"},
                },
                {
                    "type": "message",
                    "timestamp": 124,
                    "source": {"userId": "U-test"},
                    "message": {"id": "m2", "type": "image"},
                },
            ]
        }
        body = json.dumps(payload, ensure_ascii=False).encode()
        saved = []
        count = handle_webhook(body, sign(body), SECRET, saved.append)
        self.assertEqual(count, 1)
        self.assertEqual(saved[0]["message_text"], "自動化相談")
        self.assertEqual(saved[0]["source"], "line")

    def test_rejects_invalid_signature(self):
        body = b'{"events":[]}'
        with self.assertRaises(ValueError):
            handle_webhook(body, "invalid", SECRET, lambda _: None)


if __name__ == "__main__":
    unittest.main()
