import pytest
from unittest.mock import patch, MagicMock

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai-core')))

from prompt_manager import PromptManager
from response_parser import ResponseParser
from patch_generator import PatchGenerator
from providers.openai_provider import OpenAIProvider

def test_prompt_manager():
    prompt = PromptManager.get_prompt("analyze", context="Test issue")
    assert "Analyze this security vulnerability" in prompt
    assert "Test issue" in prompt

def test_response_parser_json():
    json_response = '{"analysis": "This is bad", "fix": "Fix it", "severity": "high"}'
    parsed = ResponseParser.parse_ai_response(json_response)
    assert parsed["analysis"] == "This is bad"
    assert parsed["fix"] == "Fix it"

def test_response_parser_text():
    text_response = "This is a critical issue.\n```python\nprint('fixed')\n```"
    parsed = ResponseParser.parse_ai_response(text_response)
    assert parsed["severity"] == "critical"
    assert "print('fixed')" in parsed["fix"]

@patch('requests.post')
def test_openai_provider(mock_post):
    provider = OpenAIProvider()
    provider.api_key = "fake_key"
    
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [
            {"message": {"content": '{"analysis": "test analysis", "fix": "test fix"}'}}
        ]
    }
    mock_post.return_value = mock_response
    
    result = provider.analyze_vulnerability({"file": "test.py", "line": 10})
    assert result["vulnerability_id"] == "test.py:10"
    assert result["analysis"] == "test analysis"
    assert result["fix"] == "test fix"
