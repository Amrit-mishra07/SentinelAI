"""Validate structured AI output before it can become a proposed patch."""

import json


class ResponseParser:
    @staticmethod
    def parse_ai_response(response: str) -> dict:
        """Reject prose/code-fence fallbacks instead of guessing executable edits."""
        if not isinstance(response, str) or len(response.encode("utf-8")) > 196608:
            raise ValueError("AI response is missing or exceeds the output limit")
        try:
            data = json.loads(response)
        except (json.JSONDecodeError, TypeError) as exc:
            raise ValueError("AI response must be valid JSON") from exc
        if not isinstance(data, dict) or set(data) != {"analysis", "fix"}:
            raise ValueError("AI response must contain exactly analysis and fix")
        if not isinstance(data["analysis"], str) or not isinstance(data["fix"], str):
            raise ValueError("AI analysis and fix must be strings")
        if not data["analysis"].strip():
            raise ValueError("AI analysis must not be empty")
        return data
