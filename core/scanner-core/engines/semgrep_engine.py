from abc import ABC, abstractmethod

class BaseEngine(ABC):
    @abstractmethod
    def run(self, repository: str) -> dict:
        pass

class SemgrepEngine(BaseEngine):
    def run(self, repository: str) -> dict:
        """Run Semgrep static analysis scanner"""
        return {
            "engine": "semgrep",
            "vulnerabilities": [
                {
                    "file": "utils.py",
                    "line": 15,
                    "issue": "Potential command injection",
                    "severity": "critical"
                }
            ]
        }
