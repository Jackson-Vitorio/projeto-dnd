#!/usr/bin/env python3
"""Servidor HTTP local para testar a aplicação.

Restrito a 127.0.0.1 (não exposto à rede/LAN), sem CORS e com headers de
segurança básicos. Listagem de diretórios desabilitada."""
import http.server
import os
import sys

PORT = 5000
DIR = os.path.join(os.path.dirname(__file__), '..', '5etools-src-translation-main')

class LocalServerHandler(http.server.SimpleHTTPRequestHandler):
    """Servidor HTTP local restrito a localhost, sem CORS exposto e com
    headers de segurança básicos. Serve apenas a mesma origem da aplicação."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIR, **kwargs)

    # Bloqueia listagem de diretórios (exposição desnecessária de arquivos)
    def list_directory(self, path):
        self.send_error(404, "File not found")
        return None

    def end_headers(self):
        # Headers de segurança básicos
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        # NOTA: sem Access-Control-Allow-Origin => CORS desabilitado.
        # O app serve dados da própria origem, portanto CORS "*" não é necessário
        # e elimina risco de CSRF/DNS-rebinding.
        super().end_headers()

    def log_message(self, format, *args):
        # Sem mudanças de segurança; mantém log simples
        super().log_message(format, *args)

if __name__ == '__main__':
    server_address = ('127.0.0.1', PORT)
    print(f"Servidor local rodando em http://127.0.0.1:{PORT}")
    print(f"(restrito a localhost, sem CORS, com headers de segurança)")
    print(f"Servindo: {DIR}")
    print("Pressione Ctrl+C para parar.")
    httpd = http.server.HTTPServer(server_address, LocalServerHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor parado.")