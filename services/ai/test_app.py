import unittest

from app import RequestAnalysisInput, analyze_request


class RequestAnalysisTests(unittest.TestCase):
    def analyze(self, message, location=None):
        return analyze_request(RequestAnalysisInput(message=message, location=location))

    def test_battery_immobilization_is_high_urgency(self):
        result = self.analyze('Ma Toyota ne démarre plus, batterie à plat à Cocody', 'Cocody')

        self.assertEqual(result['service_category'], 'auto')
        self.assertEqual(result['breakdown_type'], 'battery')
        self.assertEqual(result['detected_district'], 'Cocody')
        self.assertEqual(result['urgency'], 'high')

    def test_highway_request_keeps_city_and_kilometer_marker(self):
        result = self.analyze('Pneu crevé sur autoroute du Nord au PK 145 vers Toumodi')

        self.assertEqual(result['breakdown_type'], 'flat_tire')
        self.assertEqual(result['location_type'], 'highway')
        self.assertEqual(result['detected_city'], 'Toumodi')
        self.assertEqual(result['highway_milestone'], 'PK 145')
        self.assertEqual(result['urgency'], 'high')

    def test_plumbing_request_is_not_classified_as_automotive(self):
        result = self.analyze('Je cherche un plombier pour une fuite d’eau à Yopougon', 'Yopougon')

        self.assertEqual(result['service_category'], 'plomberie')
        self.assertFalse(result['is_automotive'])
        self.assertEqual(result['breakdown_type'], 'other')

    def test_engine_overheating_is_high_urgency(self):
        result = self.analyze('Le moteur chauffe et fait de la fumée à Bouaké')

        self.assertEqual(result['service_category'], 'auto')
        self.assertEqual(result['detected_city'], 'Bouake')
        self.assertEqual(result['breakdown_type'], 'engine_failure')
        self.assertEqual(result['urgency'], 'high')

    def test_short_city_alias_does_not_match_inside_another_word(self):
        result = self.analyze('Ma maman cherche un service de ménage')

        self.assertEqual(result['service_category'], 'menage')
        self.assertEqual(result['detected_city'], 'Abidjan')

    def test_unknown_request_has_low_heuristic_confidence(self):
        result = self.analyze('Bonjour, avez-vous des informations ?')

        self.assertEqual(result['service_category'], 'other')
        self.assertLess(result['confidence'], 0.5)


if __name__ == '__main__':
    unittest.main()
