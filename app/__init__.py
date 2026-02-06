"""
RoboStik Flask aplikacija
Inicijalizacija in konfiguracija
"""

from flask import Flask
from flask_cors import CORS


def create_app():
    """Factory funkcija za ustvarjanje Flask aplikacije"""
    app = Flask(__name__, 
                static_folder='static',
                template_folder='templates')
    
    # Omogoči CORS
    CORS(app)
    
    # Registriraj blueprint-e
    from app.routes import api_bp
    app.register_blueprint(api_bp)
    
    return app
