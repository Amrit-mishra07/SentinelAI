import subprocess
import json
from abc import ABC, abstractmethod

class BaseEngine(ABC):
    @abstractmethod
    def run(self, repository: str) -> dict:
        pass

class SemgrepEngine(BaseEngine):
    def run(self, repository: str) -> dict:
        """Run Semgrep static analysis scanner"""
        try:
            result = subprocess.run(
                ["semgrep", "scan", "--json", repository],
                capture_output=True,
                text=True
            )
            
            output = json.loads(result.stdout)
            
            vulnerabilities = []
            for finding in output.get("results", []):
                severity_map = {"ERROR": "critical", "WARNING": "medium", "INFO": "low"}
                severity = severity_map.get(finding.get("extra", {}).get("severity"), "medium")
                
                vulnerabilities.append({
                    "file": finding.get("path"),
                    "line": finding.get("start", {}).get("line"),
                    "issue": finding.get("extra", {}).get("message"),
                    "severity": severity,
                    "engine": "semgrep"
                })
            
            return {
                "engine": "semgrep",
                "vulnerabilities": vulnerabilities
            }
        except Exception as e:
            return {
                "engine": "semgrep",
                "error": str(e)
            }
