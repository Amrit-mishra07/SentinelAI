from .engines.bandit_engine import BanditEngine
from .engines.semgrep_engine import SemgrepEngine
from .engines.eslint_engine import ESLintEngine

class ScannerOrchestrator:
    def __init__(self):
        self.engines = [
            BanditEngine(),
            SemgrepEngine(),
            ESLintEngine()
        ]
    
    def scan(self, repository: str) -> dict:
        results = {
            "repository": repository,
            "vulnerabilities": [],
            "engines_results": {}
        }
        
        for engine in self.engines:
            engine_name = engine.__class__.__name__
            try:
                engine_results = engine.run(repository)
                results["engines_results"][engine_name] = engine_results
                results["vulnerabilities"].extend(engine_results.get("vulnerabilities", []))
            except Exception as e:
                results["engines_results"][engine_name] = {"error": str(e)}
        
        return results
