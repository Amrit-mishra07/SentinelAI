import concurrent.futures
from engines.bandit_engine import BanditEngine
from engines.semgrep_engine import SemgrepEngine
from engines.eslint_engine import ESLintEngine

class ScannerOrchestrator:
    def __init__(self):
        self.engines = [
            BanditEngine(),
            SemgrepEngine(),
            ESLintEngine()
        ]
    
    def _run_engine(self, engine, repository: str):
        engine_name = engine.__class__.__name__
        try:
            return engine_name, engine.run(repository)
        except Exception as e:
            return engine_name, {"error": str(e)}

    def scan(self, repository: str) -> dict:
        results = {
            "repository": repository,
            "vulnerabilities": [],
            "engines_results": {}
        }
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(self.engines)) as executor:
            future_to_engine = {executor.submit(self._run_engine, engine, repository): engine for engine in self.engines}
            for future in concurrent.futures.as_completed(future_to_engine):
                engine_name, engine_results = future.result()
                results["engines_results"][engine_name] = engine_results
                results["vulnerabilities"].extend(engine_results.get("vulnerabilities", []))
        
        return results
