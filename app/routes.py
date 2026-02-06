"""
RoboStik API Routes
REST API endpoint-i za upravljanje NAO robota
"""

from flask import Blueprint, jsonify, render_template, request
from app.nao_controller import get_nao_controller

# Ustvari blueprint
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
