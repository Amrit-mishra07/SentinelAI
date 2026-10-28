import json
from .base import BaseEngine, run_scanner, has_sources, CONFIG_DIR


class ESLintEngine(BaseEngine):
    name = "eslint"

    def run(self, repository: str) -> dict:
        if not has_sources(repository, (".js", ".ts", ".jsx", ".tsx")):
            return self.skipped()
        try:
            result = run_scanner(["eslint", "--no-config-lookup", "--config", str(CONFIG_DIR / "eslint.config.mjs"),
                                  "--no-error-on-unmatched-pattern", "-f", "json", "."], repository)
            if result.returncode not in (0, 1):
                raise RuntimeError(f"ESLint exited {result.returncode}: {result.stderr[:1000]}")
            output = json.loads(result.stdout)
            findings = []
            for file_result in output:
                if file_result.get("fatalErrorCount", 0):
                    raise RuntimeError("ESLint could not parse one or more source files")
                for message in file_result.get("messages", []):
                    findings.append({"file": file_result["filePath"], "line": message.get("line"),
                                     "issue": message["message"], "severity": "high" if message.get("severity") == 2 else "medium",
                                     "rule_id": message.get("ruleId") or "eslint", "engine": self.name})
            return {"engine": self.name, "status": "success", "vulnerabilities": findings}
        except Exception as error:
            return self.failure(error)
