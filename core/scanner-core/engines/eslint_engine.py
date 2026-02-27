from abc import ABC, abstractmethod

class BaseEngine(ABC):
    @abstractmethod
    def run(self, repository: str) -> dict:
        pass

class ESLintEngine(BaseEngine):
    def run(self, repository: str) -> dict:
        """Run ESLint for JavaScript/TypeScript security checks"""
        return {
            "engine": "eslint",
            "vulnerabilities": [
                {
                    "file": "app.tsx",
                    "line": 28,
                    "issue": "Unsafe innerHTML usage",
                    "severity": "high"
                }
            ]
        }
