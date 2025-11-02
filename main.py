import os
import sys
import socket

# Ensure project root is on path
sys.path.insert(0, os.path.dirname(__file__))

# Import the fully-configured Flask app (blueprints, DB, etc.)
from app import app as application


if __name__ == '__main__':
    # Bind to all interfaces so the app is reachable from your phone on the same Wi‑Fi
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', '5000'))
    debug = os.environ.get('FLASK_DEBUG', '0') == '1'

    # Try to detect LAN IP to display a friendly URL
    def get_lan_ip():
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            try:
                return socket.gethostbyname(socket.gethostname())
            except Exception:
                return 'localhost'

    lan_ip = get_lan_ip()
    print(f"\nServer URLs:")
    print(f"- Local:   http://127.0.0.1:{port}")
    # Use ASCII-only text to avoid Windows console encoding issues
    print(f"- Network: http://{lan_ip}:{port}  (use this on your phone, same Wi-Fi)\n")

    application.run(host=host, port=port, debug=debug)

# Export for WSGI servers
app = application
