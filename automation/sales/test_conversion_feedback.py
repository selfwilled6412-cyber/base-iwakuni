import unittest

from conversion_feedback import summarize


class ConversionFeedbackTests(unittest.TestCase):
    def test_ranks_by_wins_then_quotes_then_leads(self):
        result = summarize([
            {"source_theme": "日報自動化", "lead_count": 5, "quote_count": 3, "won_count": 1, "revenue_jpy": 33000},
            {"source_theme": "SNS自動化", "lead_count": 8, "quote_count": 2, "won_count": 0, "revenue_jpy": 0},
        ])
        self.assertEqual(result["themes"][0]["source_theme"], "日報自動化")
        self.assertEqual(result["themes"][0]["quote_rate"], 0.6)
        self.assertEqual(result["themes"][0]["win_rate"], 0.2)

    def test_never_allows_external_actions(self):
        result = summarize([])
        safety = result["safety"]
        self.assertFalse(safety["external_action_allowed"])
        self.assertFalse(safety["auto_publish_allowed"])
        self.assertFalse(safety["auto_contact_allowed"])
        self.assertTrue(safety["aggregate_only"])

    def test_negative_values_are_clamped(self):
        result = summarize([
            {"source_theme": "test", "lead_count": -1, "quote_count": -2, "won_count": -3, "revenue_jpy": -4}
        ])
        row = result["themes"][0]
        self.assertEqual(row["lead_count"], 0)
        self.assertEqual(row["quote_count"], 0)
        self.assertEqual(row["won_count"], 0)
        self.assertEqual(row["revenue_jpy"], 0)


if __name__ == "__main__":
    unittest.main()
