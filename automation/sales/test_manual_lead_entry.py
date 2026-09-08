import unittest

from manual_lead_entry import process_manual_lead


class ManualLeadEntryTests(unittest.TestCase):
    def test_manual_fallback_stops_before_external_action(self):
        result = process_manual_lead(
            "自動化相談 毎日20件くらい、LINEの注文内容をExcelへ転記していて面倒。見積り相談したい。"
        )
        self.assertEqual(result["source"], "manual_fallback")
        self.assertIn(result["qualification"]["priority"], {"A", "B", "C"})
        self.assertEqual(result["review_gate"]["status"], "human_review_required")
        self.assertFalse(result["review_gate"]["external_action_allowed"])
        self.assertIn("draft_message", result["proposal"])

    def test_empty_text_rejected(self):
        with self.assertRaises(ValueError):
            process_manual_lead("   ")


if __name__ == "__main__":
    unittest.main()
