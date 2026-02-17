#!/usr/bin/env python3
"""
Local server: serves static files and proxies /api/* to the Railway API.
Run: python3 serve.py [port]
Default port: 8765. Use this so the app can call /api/dashboard without CORS.
"""
import http.server
import os
import sys
import urllib.request

API_UPSTREAM = "https://web-production-1b15c.up.railway.app"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            self.proxy_to_api()
        else:
            super().do_GET()

    def proxy_to_api(self):
        url = API_UPSTREAM + self.path
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "BuysellCentralProxy/1.0"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read()
                self.send_response(resp.status)
                self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "text/plain")
            msg = f"Proxy error: {e}"
            self.send_header("Content-Length", str(len(msg)))
            self.end_headers()
            self.wfile.write(msg.encode())

    def log_message(self, format, *args):
        print(format % args)


if __name__ == "__main__":
    with http.server.HTTPServer(("", PORT), ProxyHandler) as httpd:
        print(f"Serving at http://localhost:{PORT} (static + /api -> {API_UPSTREAM})")
        httpd.serve_forever()
