"""
RoboStik API Routes
REST API endpoint-i za upravljanje NAO robota
"""

from flask import Blueprint, jsonify, render_template, request, redirect
import os
import platform
import shutil
import subprocess
from app.nao_controller import get_nao_controller, parse_choregraphe_project, scan_behaviors_in_directory

# In-memory cache of last scanned behaviours
_current_behaviours = []


# Ustvari blueprint za root (templates)
root_bp = Blueprint('root', __name__)


@root_bp.route('/', methods=['GET'])
def home():
    """Remote UI (privzeto)"""
    return redirect('/remote')


@root_bp.route('/admin', methods=['GET'])
def admin():
    """Admin UI za lokalno upravljanje"""
    server_ip = request.host.split(':')[0]
    if server_ip in ('127.0.0.1', 'localhost', '::1'):
        try:
            import socket
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('8.8.8.8', 80))
            server_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass
    return render_template('admin.html', server_ip=server_ip)


@root_bp.route('/remote', methods=['GET'])
def remote():
    """Remote UI za oddaljen dostop"""
    return render_template('remote.html')


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


@api_bp.route('/connect', methods=['POST'])
def connect_nao():
    """Nastavi IP/port in poskusi povezavo z NAO."""
    data = request.get_json() or {}
    nao_ip = (data.get('ip') or '127.0.0.1').strip()
    try:
        nao_port = int(data.get('port') or 9559)
    except Exception:
        nao_port = 9559

    controller = get_nao_controller()
    result = controller.connect_to(nao_ip, nao_port)
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code


@api_bp.route('/disconnect', methods=['POST'])
def disconnect_nao():
    """Prekini povezavo z NAO."""
    controller = get_nao_controller()
    result = controller.disconnect()
    status_code = 200 if result.get('success') else 400
    return jsonify(result), status_code


@api_bp.route('/behaviours', methods=['GET'])
def get_behaviours():
    """Vrne seznam razpoložljivih behaviourjev"""
    controller = get_nao_controller()
    behaviours = controller.get_behaviours()
    return jsonify({
        "behaviours": behaviours,
        "count": len(behaviours)
    })


@api_bp.route('/current-behaviours', methods=['GET'])
def current_behaviours():
    """Vrne zadnje skenirane behaviourje (admin scan)."""
    return jsonify({
        "behaviours": _current_behaviours,
        "count": len(_current_behaviours)
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
    global _current_behaviours
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

    _current_behaviours = behaviors
    
    return jsonify({
        "success": True,
        "message": f"Najdenih {len(behaviors)} behaviourjev",
        "behaviors": behaviors,
        "path": folder_path
    })


@api_bp.route('/open-project', methods=['GET'])
def open_project_dialog():
    """Odpre nativni file dialog (zenity/kdialog) za izbiro mape na lokalnem sistemu
    Po izbiri tudi skenira projekt (poskusi .pml parser, nato fallback na scan directory)
    in vrne seznam najdenih behaviourjev v odgovoru.
    """
    global _current_behaviours
    # Windows: uporabi tkinter file dialog, če je na voljo
    is_windows = os.name == 'nt' or platform.system().lower().startswith('win') or os.getenv('OS') == 'Windows_NT'
    if is_windows:
        try:
            import tkinter as tk
            from tkinter import filedialog

            root = tk.Tk()
            root.withdraw()
            root.attributes('-topmost', True)
            selected = filedialog.askdirectory(title='Izberi Choregraphe projekt')
            root.destroy()
        except Exception as e:
            return jsonify({
                "success": False,
                "message": f"Windows dialog ni na voljo: {e}. Vnesi pot ročno in klikni 'Skeniraj'."
            }), 500

        if not selected:
            return jsonify({"success": False, "message": "Izbira preklicana"}), 400
        if not os.path.exists(selected):
            return jsonify({"success": False, "message": f"Izbrana pot ne obstaja: {selected}"}), 400

        behaviors = parse_choregraphe_project(selected)
        if not behaviors:
            dir_behaviors = scan_behaviors_in_directory(selected)
            behaviors = [{'name': b, 'path': os.path.join(selected, b)} for b in dir_behaviors]

        _current_behaviours = behaviors

        return jsonify({"success": True, "path": selected, "behaviors": behaviors})

    # Preveri, kateri dialog je na voljo
    dialog_cmd = None
    if shutil.which('zenity'):
        dialog_cmd = ['zenity', '--file-selection', '--directory', '--title', 'Izberi Choregraphe projekt']
    elif shutil.which('kdialog'):
        dialog_cmd = ['kdialog', '--getexistingdirectory', '--title', 'Izberi Choregraphe projekt']

    if not dialog_cmd:
        system_info = f"system={platform.system()}, os.name={os.name}, OS={os.getenv('OS')}"
        return jsonify({
            "success": False,
            "message": f"Ni nameščen zenity ali kdialog na sistemu ({system_info})"
        }), 500

    try:
        res = subprocess.run(dialog_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=60)
        selected = res.stdout.strip()
        if not selected:
            return jsonify({"success": False, "message": "Izbira preklicana"}), 400
        if not os.path.exists(selected):
            return jsonify({"success": False, "message": f"Izbrana pot ne obstaja: {selected}"}), 400

        # Skeniraj projekt na strežniku
        behaviors = parse_choregraphe_project(selected)
        if not behaviors:
            dir_behaviors = scan_behaviors_in_directory(selected)
            behaviors = [{'name': b, 'path': os.path.join(selected, b)} for b in dir_behaviors]

        _current_behaviours = behaviors

        return jsonify({"success": True, "path": selected, "behaviors": behaviors})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


