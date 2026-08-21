import unittest

from line_webhook_receiver import IncomingLead
from pipeline import process_incoming_lead


class SalesPipelineTests(unittest.TestCase):
    def test_pipeline_stops_before_external_action(self):
        lead = IncomingLead(
            source="line",
            event_id="evt-1",
            user_id="U-test",
            message_text="毎日Excelから転記して時間がかかります。見積り相談したいです。",
            timestamp=123,
        )
        result = process_incoming_lead(lead)
        self.assertIn(result["qualification"]["priority"], {"A", "B", "C"})
        self.assertEqual(result["workflow_state"], "needs_human_review")
        self.assertFalse(result["external_action_allowed"])
        self.assertIn("33,000円〜", result["proposal"]["price_display"])
        self.assertTrue(result["proposal"]["questions_before_quote"])


if __name__ == "__main__":
    unittest.main()
