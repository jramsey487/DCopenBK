from django.test import SimpleTestCase

from api.utils.mis_scores import normalize_mis_payload


class TestMISScoreNormalization(SimpleTestCase):
    def test_normalizes_live_match_and_preserves_court_order(self):
        payload = {
            "Tdy": "2026-10-15",
            "LMDt": "2026-10-15",
            "LMTm": "12:00:00",
            "Fed": "MIS",
            "Cs": [
                {
                    "ID": "2",
                    "Nm": "Court 2",
                    "Sta": "5",
                    "Ms": [
                        {
                            "ID": "M1",
                            "EID": "E1",
                            "Sta": 8,
                            "Ts": [
                                {"Pos": "1", "Ps": [{"FN": "Finished", "LN": "Player"}]},
                                {"Pos": "2", "Ps": [{"FN": "Other", "LN": "Player"}]},
                            ],
                            "Ss": [
                                {"Num": 1, "T1S": 6, "T2S": 4, "Win": 1},
                            ],
                        },
                        {
                            "ID": "M2",
                            "EID": "E1",
                            "Sta": 5,
                            "Ts": [
                                {"Pos": "1", "Ps": [{"FN": "Jane", "LN": "Doe"}]},
                                {"Pos": "2", "Ps": [{"FN": "John", "LN": "Smith"}]},
                            ],
                            "Gm": {"T1S": "30", "T2S": "15", "Srv": "2"},
                            "Ss": [
                                {"Num": 1, "T1S": 6, "T2S": 4, "Win": 1},
                                {"Num": 2, "T1S": 3, "T2S": 2, "Win": 0},
                            ],
                        },
                    ],
                }
            ],
        }

        result = normalize_mis_payload(payload)
        court = result["courts"][0]
        match = court["live_match"]

        self.assertEqual("Court 2", court["court"])
        self.assertEqual("M2", match["match_id"])
        self.assertEqual(2, match["position"])
        self.assertEqual(2, match["total_matches"])
        self.assertEqual(["Jane Doe"], match["players"]["a"])
        self.assertEqual(["John Smith"], match["players"]["b"])
        self.assertEqual("30", match["point"]["a"])
        self.assertEqual("15", match["point"]["b"])
        self.assertEqual("2", match["server"])
        self.assertEqual(6, match["sets"][0]["a"])
        self.assertEqual(3, match["sets"][1]["a"])

    def test_suspended_match_is_not_reported_as_live(self):
        payload = {
            "Cs": [
                {
                    "ID": "1",
                    "Nm": "Stadium",
                    "Ms": [{"ID": "M1", "Sta": 6}],
                }
            ]
        }

        result = normalize_mis_payload(payload)
        self.assertIsNone(result["courts"][0]["live_match"])
        self.assertEqual("suspended", result["courts"][0]["matches"][0]["status"])
