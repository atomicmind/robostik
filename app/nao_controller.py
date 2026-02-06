"""
NAO Controller - Upravljanje NAO robota prek NAOqi SDK
"""

import os
from typing import Dict, List, Optional

try:
    import qi
    NAO_SDK_AVAILABLE = True
except ImportError:
    NAO_SDK_AVAILABLE = False


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
            return []
        
        try:
            return self.behavior_manager.getInstalledBehaviors()
        except Exception as e:
            print(f"Napaka pri pridobivanju seznama behaviourjev: {e}")
            return []
    
    def start_behaviour(self, behaviour_name: str) -> Dict:
        """Zaženi behaviour"""
        if not self.connected or not self.behavior_manager:
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
