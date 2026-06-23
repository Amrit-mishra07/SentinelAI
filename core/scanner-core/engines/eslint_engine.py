import subprocess
import json
import os
from abc import ABC, abstractmethod

class BaseEngine(ABC):
    @abstractmethod
    def run(self, repository: str) -> dict:
        pass

class ESLintEngine(BaseEngine):
    def run(self, repository: str) -> dict:
        """Run ESLint for JavaScript/TypeScript security checks"""
        try:
            if not any(fname.endswith(('.js', '.ts', '.jsx', '.tsx')) for root, _, files in os.walk(repository) for fname in files):
                return {"engine": "eslint", "vulnerabilities": []}

            result = subprocess.run(
                ["npx", "eslint", ".", "--ext", ".js,.jsx,.ts,.tsx", "-f", "json"],
                cwd=repository,
                capture_output=True,
                text=True
            )
            
            if not result.stdout.strip():
                return {"engine": "eslint", "vulnerabilities": []}

            output = json.loads(result.stdout)
            
            vulnerabilities = []
            for file_result in output:
                file_path = file_result.get("filePath")
                for message in file_result.get("messages", []):
                    severity = "high" if message.get("severity") == 2 else "medium"
                    vulnerabilities.append({
                        "file": file_path,
                        "line": message.get("line"),
                        "issue": message.get("message"),
                        "severity": severity,
                        "engine": "eslint"
                    })
            
            return {
                "engine": "eslint",
                "vulnerabilities": vulnerabilities
            }
        except Exception as e:
            return {
                "engine": "eslint",
                "error": str(e)
            }
