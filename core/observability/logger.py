import logging
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        self.logger.addHandler(handler)
    
    def log_event(self, event_type: str, **kwargs):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            **kwargs
        }
        self.logger.info(json.dumps(log_data))
    
    def log_error(self, error: str, **kwargs):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "error": error,
            **kwargs
        }
        self.logger.error(json.dumps(log_data))
