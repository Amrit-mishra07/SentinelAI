import subprocess
import json
from abc import ABC, abstractmethod

class BaseEngine(ABC):
    @abstractmethod
    def run(self, repository: str) -> dict:
        pass

class BanditEngine(BaseEngine):
    def run(self, repository: str) -> dict:
        """Run Bandit security scanner for Python code"""
        try:
            result = subprocess.run(
                ["bandit", "-r", repository, "-f", "json"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            # Bandit may exit with non-zero if vulns are found, but stdout still has json
            output = json.loads(result.stdout)
            
            vulnerabilities = []
            for issue in output.get("results", []):
                vulnerabilities.append({
                    "file": issue.get("filename"),
                    "line": issue.get("line_number"),
                    "issue": issue.get("issue_text"),
                    "severity": issue.get("issue_severity", "").lower(),
                    "engine": "bandit"
                })
            
            return {
                "engine": "bandit",
                "vulnerabilities": vulnerabilities
            }
        except Exception as e:
            return {
                "engine": "bandit",
                "error": str(e)
            }
