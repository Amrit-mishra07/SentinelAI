from datetime import datetime

class MetricsCollector:
    def __init__(self):
        self.metrics = {}
    
    def increment(self, metric: str, value: int = 1):
        if metric not in self.metrics:
            self.metrics[metric] = 0
        self.metrics[metric] += value
    
    def record(self, metric: str, value: float):
        self.metrics[metric] = {
            "value": value,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def get_metrics(self) -> dict:
        return self.metrics
    
    def reset(self):
        self.metrics = {}
