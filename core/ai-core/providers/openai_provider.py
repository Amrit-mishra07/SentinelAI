"""OpenAI analysis with strict output validation and honest failure provenance."""

import json
import os
import sys
import time

import requests

# Keep legacy top-level core imports usable while packaged imports remain relative.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "apps", "aipcsr-api")))
from app.config.settings import settings

try:
    from ..prompt_manager import PromptManager
    from ..response_parser import ResponseParser
    from ..patch_generator import apply_unified_diff, source_hash, validate_source
except ImportError:
    from prompt_manager import PromptManager
    from response_parser import ResponseParser
    from patch_generator import apply_unified_diff, source_hash, validate_source


class AIProvider:
    def analyze_vulnerability(self, vulnerability: dict) -> dict:
        raise NotImplementedError


class OpenAIProvider(AIProvider):
    """Use a supplied user key or the explicitly configured server key."""

    def __init__(self, api_key: str | None = None):
        self.api_key = settings.OPENAI_API_KEY if api_key is None else api_key
        self.model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        self.timeout = getattr(settings, "OPENAI_TIMEOUT_SECONDS", 45)

    def analyze_vulnerability(self, vulnerability: dict) -> dict:
        source = vulnerability.get("source_content") or ""
        result = {
            "vulnerability_id": f"{vulnerability.get('file')}:{vulnerability.get('line')}",
            "analysis": "",
            "fix": "",
            "status": "unavailable",
            "provider": "openai",
            "model": self.model,
            "source_sha": vulnerability.get("commit_hash"),
            "source_hash": source_hash(source),
            "prompt_version": PromptManager.VERSION,
            "validation": {"status": "not_run", "checks": []},
        }
        if not self.api_key:
            result["error"] = "AI analysis unavailable: configure an OpenAI API key in integrations or on the server"
            return result
        if not source:
            result["error"] = "AI patch unavailable: the scanned source snapshot was not captured"
            return result
        if len(source.encode("utf-8")) > 131072:
            result["error"] = "AI patch unavailable: source exceeds the 128 KiB context limit"
            return result
        context = {
            key: vulnerability.get(key)
            for key in ("file", "line", "issue", "severity", "rule_id", "commit_hash", "source_content", "source_context")
        }
        request_body = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": PromptManager.SYSTEM_PROMPT},
                {"role": "user", "content": PromptManager.get_prompt("analyze", context=json.dumps(context))},
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "security_analysis",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {"analysis": {"type": "string"}, "fix": {"type": "string"}},
                        "required": ["analysis", "fix"],
                        "additionalProperties": False,
                    },
                },
            },
            "max_tokens": 4096,
        }
        error = "OpenAI request did not complete"
        for attempt in range(3):
            try:
                response = requests.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
                    json=request_body,
                    timeout=(5, self.timeout),
                )
                if response.status_code == 429 or response.status_code >= 500:
                    error = f"OpenAI temporarily unavailable (HTTP {response.status_code})"
                    if attempt < 2:
                        time.sleep(2 ** attempt)
                        continue
                    break
                if response.status_code != 200:
                    error = f"OpenAI rejected the analysis request (HTTP {response.status_code})"
                    break
                choices = response.json().get("choices", [])
                if not choices or choices[0].get("finish_reason") != "stop":
                    raise ValueError("OpenAI response was incomplete")
                message = choices[0].get("message", {})
                if message.get("refusal"):
                    raise ValueError("OpenAI declined to generate a patch for this finding")
                parsed = ResponseParser.parse_ai_response(message.get("content"))
                result.update(parsed, status="available")
                if parsed["fix"]:
                    try:
                        updated = apply_unified_diff(source, parsed["fix"], vulnerability["file"])
                        if vulnerability["file"].endswith(".py"):
                            result["validation"] = validate_source(updated, vulnerability["file"])
                        else:
                            result["validation"] = {
                                "status": "not_run",
                                "checks": ["exact_diff_context"],
                                "error": "Automatic validation supports Python only; manually review this suggestion",
                            }
                    except (KeyError, ValueError) as exc:
                        result.update(status="failed", fix="", error=str(exc))
                        result["validation"] = {"status": "failed", "checks": [], "error": str(exc)}
                return result
            except (requests.Timeout, requests.ConnectionError):
                error = "OpenAI request timed out or the service could not be reached"
                if attempt < 2:
                    time.sleep(2 ** attempt)
                    continue
                break
            except (ValueError, KeyError, TypeError, IndexError) as exc:
                error = str(exc) if isinstance(exc, ValueError) else "OpenAI response did not match the expected structure"
                break
            except requests.RequestException:
                error = "OpenAI request failed"
                break
        result.update(status="failed", error=error)
        return result
