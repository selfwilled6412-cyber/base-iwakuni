import unittest

from quote_readiness import assess


class QuoteReadinessTests(unittest.TestCase):
    def test_incomplete_lead_stays_blocked(self):
        result = assess({"problem": "日報集計を自動化したい"})
        self.assertFalse(result["quote_ready"])
        self.assertFalse(result["external_action_allowed"])
        self.assertFalse(result["price_commitment_allowed"])
        self.assertIn("現在の作業手順", result["missing_before_quote"])

    def test_complete_lead_can_move_to_human_quote_review_only(self):
        result = assess({
            "problem": "日報集計を自動化したい",
            "current_flow": "フォーム入力後にスプレッドシートへ集計",
            "frequency": "毎日",
            "tools": ["Google Forms", "Google Sheets"],
            "timing": "今月中",
            "personal_data_involved": "なし",
        })
        self.assertTrue(result["quote_ready"])
        self.assertEqual([], result["missing_before_quote"])
        self.assertFalse(result["external_action_allowed"])
        self.assertFalse(result["price_commitment_allowed"])
        self.assertIn("人が内容を確認", result["next_action"])


if __name__ == "__main__":
    unittest.main()
