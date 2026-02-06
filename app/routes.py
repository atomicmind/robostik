"""
RoboStik API Routes
REST API endpoint-i za upravljanje NAO robota
"""

from flask import Blueprint, jsonify, render_template, request
import os
from app.nao_controller import get_nao_controller, parse_choregraphe_project, scan_behaviors_in_directory


# Ustvari blueprint za root (templates)
root_bp = Blueprint('root', __name__)


@root_bp.route('/', methods=['GET'])
def home():
    """Vrne spletni vmesnik"""
    return render_template('index.html')


# Ustvari blueprint za API
api_bp = Blueprint('api', __name__, url_prefix='/api')


@api_bp.route('/', methods=['GET'])
def index():
    """Vrne osnovne informacije o API-ju"""
    return jsonify({
        "name": "RoboStik API",
        "version": "1.0.0",
        "endpoints": {
            "status": "/api/status",
            "behaviours": "/api/behaviours",
            "behaviour_start": "/api/behaviours/<name>/start",
            "behaviour_stop": "/api/behaviours/<name>/stop"
        }
    })


@api_bp.route('/status', methods=['GET'])
def status():
    """Vrne stanje robota in povezave"""
    controller = get_nao_controller()
    return jsonify(controller.get_status())


@api_bp.route('/behaviours', methods=['GET'])
def get_behaviours():
    """Vrne seznam razpoložljivih behaviourjev"""
    controller = get_nao_controller()
    behaviours = controller.get_behaviours()
    return jsonify({
        "behaviours": behaviours,
        "count": len(behaviours)
    })


@api_bp.route('/behaviours/<behaviour_name>/start', methods=['POST'])
def start_behaviour(behaviour_name):
    """Zaženi behaviour"""
    controller = get_nao_controller()
    result = controller.start_behaviour(behaviour_name)
    status_code = 200 if result['success'] else 400
    return jsonify(result), status_code


@api_bp.route('/behaviours/<behaviour_name>/stop', methods=['POST'])
def stop_behaviour(behaviour_name):
    """Ustavi behaviour"""
    controller = get_nao_controller()
    result = controller.stop_behaviour(behaviour_name)
    status_code = 200 if result['success'] else 400
    return jsonify(result), status_code


@api_bp.route('/scan-folder', methods=['POST'])
def scan_folder():
    """Skenira Choregraphe projekt in najde behaviourje"""
    data = request.get_json()
    folder_path = data.get('path', '')
    
    if not folder_path:
        return jsonify({
            "success": False,
            "message": "Pot do mape je prazna",
            "behaviors": []
        }), 400
    
    # Preveri ali mapa obstaja
    if not os.path.exists(folder_path):
        return jsonify({
            "success": False,
            "message": f"Mapa ne obstaja: {folder_path}",
            "behaviors": []
        }), 404
    
    # Poskusi parsirati Choregraphe projekt (.pml)
    behaviors = parse_choregraphe_project(folder_path)
    
    # Če ni behaviourjev iz .pml, skeni direktorije
    if not behaviors:
        dir_behaviors = scan_behaviors_in_directory(folder_path)
        behaviors = [{'name': b, 'path': os.path.join(folder_path, b)} for b in dir_behaviors]
    
    return jsonify({
        "success": True,
        "message": f"Najdenih {len(behaviors)} behaviourjev",
        "behaviors": behaviors,
        "path": folder_path
    })
