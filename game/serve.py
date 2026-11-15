# Tiny local server for the game. Unlike "python -m http.server" it tells the browser never to keep old copies,
# so a new build always shows up. Usage: python serve.py PORT
import http.server, socketserver, sys, os, re
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0'); super().end_headers()
    def send_head(self):
        # MP4 clip playback needs byte ranges, including seeks into repair segments.
        path = self.translate_path(self.path)
        self.range_remaining = None
        if not path.lower().endswith('.mp4') or not os.path.isfile(path):
            return super().send_head()
        size = os.path.getsize(path)
        start, end = 0, size - 1
        requested = self.headers.get('Range')
        if requested:
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', requested.strip())
            valid = match and any(match.groups())
            if valid:
                lo, hi = match.groups()
                if lo:
                    start = int(lo); end = min(int(hi), size - 1) if hi else size - 1
                else:
                    start = max(0, size - int(hi)); end = size - 1
                valid = 0 <= start <= end < size
            if not valid:
                self.send_response(416); self.send_header('Content-Range', f'bytes */{size}')
                self.send_header('Content-Length', '0'); self.end_headers(); return None
        stream = open(path, 'rb'); stream.seek(start)
        self.send_response(206 if requested else 200)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        if requested: self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        self.end_headers(); self.range_remaining = end - start + 1
        return stream

    def copyfile(self, source, outputfile):
        if self.range_remaining is None:
            return super().copyfile(source, outputfile)
        remaining = self.range_remaining
        while remaining:
            block = source.read(min(65536, remaining))
            if not block: break
            outputfile.write(block); remaining -= len(block)

    def log_message(self, *a): pass
def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8778
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(('127.0.0.1', port), H) as s: s.serve_forever()

if __name__ == '__main__':
    main()
