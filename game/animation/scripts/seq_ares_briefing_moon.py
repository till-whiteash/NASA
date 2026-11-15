"""The Moon mission's version of the Ares VI briefing (same room, shots and crew; Moon dialogue, hologram and screens)."""
import os, runpy
os.environ['BRIEF'] = 'moon'
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seq_ares_briefing.py'), run_name='__main__')
