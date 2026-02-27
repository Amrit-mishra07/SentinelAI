from datetime import datetime

class ReportBuilder:
    def __init__(self):
        self.vulnerabilities = []
        self.metadata = {}
    
    def add_vulnerability(self, vuln: dict):
        self.vulnerabilities.append(vuln)
        return self
    
    def set_metadata(self, key: str, value: any):
        self.metadata[key] = value
        return self
    
    def build(self) -> dict:
        return {
            "generated_at": datetime.utcnow().isoformat(),
            "vulnerabilities": self.vulnerabilities,
            "total_count": len(self.vulnerabilities),
            "metadata": self.metadata
        }
