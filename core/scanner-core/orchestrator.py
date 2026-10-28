"""Concurrent scanner execution with explicit coverage and failure semantics."""
import concurrent.futures
import os
try:
    from .engines.bandit_engine import BanditEngine
    from .engines.semgrep_engine import SemgrepEngine
    from .engines.eslint_engine import ESLintEngine
except ImportError:
    from engines.bandit_engine import BanditEngine
    from engines.semgrep_engine import SemgrepEngine
    from engines.eslint_engine import ESLintEngine


class ScannerOrchestrator:
    def __init__(self):
        self.engines = [BanditEngine(), SemgrepEngine(), ESLintEngine()]

    def _run_engine(self, engine, repository: str) -> tuple[str, dict]:
        try:
            return engine.name, engine.run(repository)
        except Exception as error:
            return engine.name, engine.failure(error)

    def scan(self, repository: str) -> dict:
        if os.getenv("SCANNER_SERVICE_URL"):
            try:
                from .remote import scan_remote
            except ImportError:
                from remote import scan_remote
            return scan_remote(repository)
        results = {"repository": repository, "vulnerabilities": [], "engines_results": {}, "failures": []}
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(self.engines)) as executor:
            futures = [executor.submit(self._run_engine, engine, repository) for engine in self.engines]
            for future in concurrent.futures.as_completed(futures):
                name, outcome = future.result()
                results["engines_results"][name] = outcome
                if outcome.get("status") == "failed" or outcome.get("error"):
                    results["failures"].append(f"{name}: {outcome.get('error', 'scanner failed')}")
                results["vulnerabilities"].extend(outcome.get("vulnerabilities", []))
        succeeded = any(v.get("status") == "success" for v in results["engines_results"].values())
        if not succeeded and not results["failures"]:
            results["failures"].append("No supported source files were analyzed")
        results["status"] = "failed" if results["failures"] else "success"
        return results
