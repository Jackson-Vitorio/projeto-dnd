#!/usr/bin/env python3
"""Servidor HTTP simples com suporte a CORS para testar a aplicação."""
import http.server
import os
import sys

PORT = 5000
DIR = os.path.join(os.path.dirname(__file__), '..', '5etools-src-translation-main')

class CORSHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == '__main__':
    print(f"Servidor rodando em http://localhost:{PORT}")
    print(f"Servindo: {DIR}")
    print("Pressione Ctrl+C para parar.")
    httpd = http.server.HTTPServer(('', PORT), CORSHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor parado.")