"""The API can return an HTTP 200 error; reject it before it reaches the game."""
import copy
import json
import unittest
from pathlib import Path
from build import read_table

class HorizonsParserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.payload=json.loads((Path(__file__).parent/'evidence/horizons-earth.json').read_text(encoding='utf-8'))['response']

    def test_fixture_has_all_dates(self):
        self.assertEqual(len(read_table(self.payload,'399')),25)

    def test_http_200_error_is_not_data(self):
        with self.assertRaisesRegex(ValueError,'Horizons error'):
            read_table({'error':'No ephemeris available'},'399')

    def test_wrong_target_is_rejected(self):
        with self.assertRaisesRegex(ValueError,'target'):
            read_table(self.payload,'499')

    def test_utc_and_other_frame_are_not_silently_accepted(self):
        for old,new in [('JDTDB','JDUTC'),('Ecliptic of J2000.0','Equator of date')]:
            altered=copy.deepcopy(self.payload)
            altered['result']=altered['result'].replace(old,new)
            with self.assertRaisesRegex(ValueError,'time scale/reference plane'):
                read_table(altered,'399')

    def test_future_api_version_requires_review(self):
        altered=copy.deepcopy(self.payload)
        altered['signature']['version']='99.0'
        with self.assertRaisesRegex(ValueError,'API changed'):
            read_table(altered,'399')

    def test_kilometres_cannot_be_read_as_au(self):
        altered=copy.deepcopy(self.payload)
        altered['result']=altered['result'].replace('AU-D','KM-S')
        with self.assertRaisesRegex(ValueError,'units'):
            read_table(altered,'399')

if __name__=='__main__':
    unittest.main()
