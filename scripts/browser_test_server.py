"""Use the game's range-aware MP4 server in browser regressions."""
from pathlib import Path
import functools
import http.server
import importlib.util
import threading

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('game_server', ROOT / 'game/serve.py')
game_server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(game_server)

class Quiet(game_server.H):
    def copyfile(self, source, outputfile):
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Skip cancels an in-flight movie download.

def start_server():
    server = http.server.ThreadingHTTPServer(
        ('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server
