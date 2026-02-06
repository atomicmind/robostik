#!/usr/bin/env python3
"""
RoboStik - NAO v6 Web Interface
Main entry point za Flask aplikacijo
"""

import os
import sys
from dotenv import load_dotenv

# Naloži okoljske spremenljivke iz .env
load_dotenv()

# Dodaj NAO SDK v Python path
nao_path = os.getenv('NAO_BEHAVIORS_PATH', '/home/atomicmind/APPS/nao/')
sdk_lib_path = os.path.join(nao_path, 'lib', 'python')
if os.path.exists(sdk_lib_path):
    sys.path.insert(0, sdk_lib_path)

from app import create_app

if __name__ == '__main__':
    app = create_app()
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=False, host='0.0.0.0', port=5000, use_reloader=False)
