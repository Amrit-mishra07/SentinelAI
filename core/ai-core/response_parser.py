import json
import re

class ResponseParser:
    @staticmethod
    def parse_ai_response(response: str) -> dict:
        """Parse AI model response into structured format"""
        try:
            # Try JSON parsing first
            return json.loads(response)
        except json.JSONDecodeError:
            # Fall back to regex extraction
            return ResponseParser._extract_from_text(response)
    
    @staticmethod
    def _extract_from_text(text: str) -> dict:
        """Extract structured data from plain text response"""
        result = {
            "analysis": text,
            "severity": ResponseParser._extract_severity(text),
            "fix": ResponseParser._extract_code_block(text)
        }
        return result
    
    @staticmethod
    def _extract_severity(text: str) -> str:
        for level in ["critical", "high", "medium", "low"]:
            if level in text.lower():
                return level
        return "medium"
    
    @staticmethod
    def _extract_code_block(text: str) -> str:
        match = re.search(r'```[\w]*\n(.*?)\n```', text, re.DOTALL)
        return match.group(1) if match else ""
