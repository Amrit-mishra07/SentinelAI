from abc import ABC, abstractmethod

class BaseEngine(ABC):
    @abstractmethod
    def run(self, repository: str) -> dict:
        pass

class BanditEngine(BaseEngine):
    def run(self, repository: str) -> dict:
        """Run Bandit security scanner for Python code"""
        return {
            "engine": "bandit",
            "vulnerabilities": [
                {
                    "file": "app.py",
                    "line": 42,
                    "issue": "Hardcoded SQL password",
                    "severity": "high"
                }
            ]
        }
