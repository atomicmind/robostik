"""
NAO Controller - Upravljanje NAO robota prek NAOqi SDK
"""

import os
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional
import zipfile
import tempfile
import requests

try:
    import qi
    NAO_SDK_AVAILABLE = True
except (ImportError, SyntaxError):
    # NAO SDK ni dostopen ali ima Python 2 syntax
    NAO_SDK_AVAILABLE = False


def parse_choregraphe_project(project_path: str) -> List[Dict]:
    """Parsira Choregraphe projekt (.pml) i vrne seznam behaviourjev"""
    behaviors = []
    
    if not os.path.exists(project_path):
        return behaviors
    
    # Najdi .pml datoteku (Choregraphe project file)
    pml_files = [f for f in os.listdir(project_path) if f.endswith('.pml')]
    
    if not pml_files:
        return behaviors
    
    pml_file = os.path.join(project_path, pml_files[0])
    
    try:
        tree = ET.parse(pml_file)
        root = tree.getroot()

        # Parsira BehaviorDescription elemente in njihove .xar datoteke
        for bd in root.findall('.//BehaviorDescription'):
            name = bd.get('name') or ''
            src = bd.get('src') or ''
            xar_attr = bd.get('xar') or ''
            
            if src and xar_attr:
                # Pot do .xar datoteke
                xar_path = os.path.join(project_path, src, xar_attr)
                if os.path.exists(xar_path):
                    # Ekstrahiraj in parsiraj inner .pml iz .xar (ZIP)
                    inner_behaviors = _parse_xar_file(xar_path, src)
                    behaviors.extend(inner_behaviors)
                else:
                    # Ako nema .xar, samo dodaj behavior kao fallback
                    if name:
                        behaviors.append({
                            'name': name,
                            'id': '',
                            'path': os.path.join(project_path, src)
                        })
    except Exception as e:
        print(f"Napaka pri parsiranju .pml datoteke: {e}")

    # Fallback: ako nema behaviors, skeniraj direktorije
    if not behaviors:
        dir_behaviors = scan_behaviors_in_directory(project_path)
        behaviors = [{'name': b, 'path': os.path.join(project_path, b)} for b in dir_behaviors]

    return behaviors


def _parse_xar_file(xar_path: str, behavior_dir: str) -> List[Dict]:
    """Ekstrahiraj i parsiraj Box elemente iz .xar XML datoteke (sa namespace podrskom)"""
    behaviors = []
    
    try:
        # .xar je XML datoteka (Choregraphe project)
        tree = ET.parse(xar_path)
        root = tree.getroot()
        
        # Registriraj Choregraphe namespace
        ns = {'ch': 'http://www.ald.softbankrobotics.com/schema/choregraphe/project.xsd'}
        
        # Traži Box elemente direktno u Diagram elementima
        # (ne u BoxSection koji se koristi za interni raspored)
        boxes = root.findall('.//ch:Diagram/ch:Box', ns)
        
        seen_names = set()  # Praćenje jedinstvenih imena za izbjegavanje duplikata
        for box in boxes:
            name = box.get('name', '').strip()
            id_attr = box.get('id', '')
            
            # Preskoči root, interne boxe (__)  i duplikate
            if (name and name.lower() != 'root' and 
                not name.startswith('__') and name not in seen_names):
                behaviors.append({
                    'name': name,
                    'id': id_attr,
                    'path': os.path.join(behavior_dir, name)
                })
                seen_names.add(name)
    except Exception as e:
        print(f"Napaka pri parsiranju .xar datoteke: {e}")
    
    return behaviors


def scan_behaviors_in_directory(path: str) -> List[str]:
    """Alternativna metoda: skeni direktorij in najdi behavior direktorije"""
    behaviors = []
    
    if not os.path.exists(path):
        return behaviors
    
    try:
        for item in os.listdir(path):
            full_path = os.path.join(path, item)
            # Iskalnik za behavior direktorije (behavior_1, behavior_2, itd.)
            if os.path.isdir(full_path) and item.startswith('behavior'):
                behaviors.append(item)
    except Exception as e:
        print(f"Napaka pri skeniranju behaviourjev: {e}")
    
    return sorted(behaviors)


class NAOController:
    """Kontroler za upravljanje NAO robota"""
    
    def __init__(self, nao_ip: str = '127.0.0.1', nao_port: int = 9559):
        """
        Inicijalizacija NAO kontrolerja
        
        Args:
            nao_ip: IP naslov NAO robota ali brokerja
            nao_port: Port NAO brokerja
        """
        self.nao_ip = nao_ip
        self.nao_port = nao_port
        self.session = None
        self.behavior_manager = None
        self.connected = False
        
        if NAO_SDK_AVAILABLE:
            self._connect()
    
    def _connect(self) -> bool:
        """Poveži se s NAO robotom"""
        try:
            self.session = qi.Session()
            self.session.connect(f"tcp://{self.nao_ip}:{self.nao_port}")
            self.behavior_manager = self.session.service("ALBehaviorManager")
            self.connected = True
            return True
        except Exception as e:
            print(f"Napaka pri povezavi z NAO: {e}")
            self.connected = False
            return False
    
    def get_status(self) -> Dict:
        """Vrne stanje robota in povezave"""
        return {
            "connected": self.connected,
            "nao_ip": self.nao_ip,
            "nao_port": self.nao_port,
            "sdk_available": NAO_SDK_AVAILABLE,
            "message": "Povezano z NAO robotom" if self.connected else "Ni povezave z NAO robotom"
        }
    
    def get_behaviours(self) -> List[str]:
        """Vrne seznam razpoložljivih behaviourjev"""
        if not self.connected or not self.behavior_manager:
            # Poskusi uporabiti bridge, če je nastavljen
            bridge_url = os.getenv('BRIDGE_URL')
            if bridge_url:
                try:
                    res = requests.get(bridge_url.rstrip('/') + '/bridge/behaviours', timeout=5)
                    if res.ok:
                        return res.json().get('behaviours', [])
                except Exception as e:
                    print(f"Bridge napaka pri pridobivanju behaviourjev: {e}")
            # Mock mode: vrni testne behaviourje
            return [
                "animations/Stand/Gestures/Hey_1",
                "animations/Stand/Gestures/Hello_1",
                "animations/Stand/Waiting/Think_1",
                "animations/Sit/Emotions/Positive/Laugh_1"
            ]
        
        try:
            return self.behavior_manager.getInstalledBehaviors()
        except Exception as e:
            print(f"Napaka pri pridobivanju seznama behaviourjev: {e}")
            return []
    
    def start_behaviour(self, behaviour_name: str) -> Dict:
        """Zaženi behaviour"""
        if not self.connected or not self.behavior_manager:
            # Poskusi bridge, če je nastavljen
            bridge_url = os.getenv('BRIDGE_URL')
            if bridge_url:
                try:
                    res = requests.post(bridge_url.rstrip('/') + f'/bridge/behaviours/{behaviour_name}/start', timeout=5)
                    if res.ok:
                        return {"success": True, "message": f"Zažen preko bridge: {behaviour_name}", "behaviour": behaviour_name}
                    else:
                        return {"success": False, "message": res.text, "behaviour": behaviour_name}
                except Exception as e:
                    return {"success": False, "message": str(e), "behaviour": behaviour_name}
            return {
                "success": False,
                "message": "Ni povezave z NAO robotom",
                "behaviour": behaviour_name
            }
        
        try:
            self.behavior_manager.runBehavior(behaviour_name)
            return {
                "success": True,
                "message": f"Behaviour '{behaviour_name}' je bil zažen",
                "behaviour": behaviour_name
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Napaka pri zagonu behaviourja: {e}",
                "behaviour": behaviour_name
            }
    
    def stop_behaviour(self, behaviour_name: str) -> Dict:
        """Ustavi behaviour"""
        if not self.connected or not self.behavior_manager:
            bridge_url = os.getenv('BRIDGE_URL')
            if bridge_url:
                try:
                    res = requests.post(bridge_url.rstrip('/') + f'/bridge/behaviours/{behaviour_name}/stop', timeout=5)
                    if res.ok:
                        return {"success": True, "message": f"Ustavljeno preko bridge: {behaviour_name}", "behaviour": behaviour_name}
                    else:
                        return {"success": False, "message": res.text, "behaviour": behaviour_name}
                except Exception as e:
                    return {"success": False, "message": str(e), "behaviour": behaviour_name}
            return {
                "success": False,
                "message": "Ni povezave z NAO robotom",
                "behaviour": behaviour_name
            }
        
        try:
            self.behavior_manager.stopBehavior(behaviour_name)
            return {
                "success": True,
                "message": f"Behaviour '{behaviour_name}' je bil ustavljen",
                "behaviour": behaviour_name
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Napaka pri ustavljanju behaviourja: {e}",
                "behaviour": behaviour_name
            }


# Globalna instanca kontrolerja
_controller: Optional[NAOController] = None


def get_nao_controller() -> NAOController:
    """Vrni globalno instanco NAO kontrolerja"""
    global _controller
    if _controller is None:
        nao_ip = os.getenv('NAO_IP', '127.0.0.1')
        nao_port = int(os.getenv('NAO_PORT', 9559))
        _controller = NAOController(nao_ip, nao_port)
    return _controller
