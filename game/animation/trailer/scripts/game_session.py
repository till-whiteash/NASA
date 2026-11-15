"""Shared helper: serve game/, open it in Edge with #debug, skip the opening films, wait for the world."""
from playwright.sync_api import sync_playwright
import functools, http.server, threading
from pathlib import Path
ROOT = Path(__file__).resolve().parents[4]          # repo root (holds game/)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()

def open_game(p, w=1920, h=1080, headless=True):
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    b = p.chromium.launch(channel='msedge', headless=headless, args=['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'])
    page = b.new_page(viewport={'width': w, 'height': h})
    page.on('pageerror', lambda e: print('PAGEERROR', str(e)[:200]))
    page.route('**/block-island.stl', lambda r: r.abort())
    page.goto(f'http://127.0.0.1:{server.server_port}/game/#debug', wait_until='networkidle', timeout=120000)
    page.click('#start')
    for _ in range(2):
        page.wait_for_selector('.cinematic canvas, .cinematic video', timeout=120000); page.wait_for_timeout(600); page.keyboard.press('Escape'); page.wait_for_timeout(900)
    page.wait_for_selector('.briefing-walk .bw-ready', timeout=120000); page.click('.briefing-walk .bw-ready')
    page.wait_for_function('window.game?.world?.settlement && window.game.world.suit', timeout=240000)
    page.wait_for_timeout(4000)
    return b, page
