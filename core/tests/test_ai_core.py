"""AI responses must be structured, contextual and safe to review."""

import difflib
import json
import os
import sys
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ai-core")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "apps", "aipcsr-api")))

from prompt_manager import PromptManager
from response_parser import ResponseParser
from patch_generator import apply_unified_diff
from providers.openai_provider import OpenAIProvider

SOURCE = "import subprocess\nsubprocess.run('echo hi', shell=True)\n"
UPDATED = "import subprocess\nsubprocess.run(['echo', 'hi'], check=True)\n"
DIFF = "".join(difflib.unified_diff(SOURCE.splitlines(True), UPDATED.splitlines(True), "a/test.py", "b/test.py"))


def finding():
    return {"file": "test.py", "line": 2, "source_content": SOURCE, "commit_hash": "a" * 40}


def response(payload=None, status=200, finish="stop", refusal=None):
    result = MagicMock()
    result.status_code = status
    result.json.return_value = {"choices": [{"finish_reason": finish, "message": {
        "content": json.dumps(payload or {"analysis": "Avoid shell interpretation.", "fix": DIFF}),
        "refusal": refusal,
    }}]}
    return result


def test_prompt_manager_marks_repository_text_as_untrusted():
    assert "untrusted data" in PromptManager.SYSTEM_PROMPT
    assert "Test issue" in PromptManager.get_prompt("analyze", context="Test issue")


def test_response_parser_rejects_non_json_and_extra_fields():
    for value in ("Explanation with a code block", '{"analysis":"bad","fix":"","other":true}', "[]",
                  '{"analysis":"ok","fix":42}'):
        with pytest.raises(ValueError):
            ResponseParser.parse_ai_response(value)


def test_response_parser_accepts_exact_string_fields():
    assert ResponseParser.parse_ai_response('{"analysis":"Reason","fix":""}') == {"analysis": "Reason", "fix": ""}


@patch("requests.post")
def test_openai_provider_validates_contextual_diff(mock_post):
    mock_post.return_value = response()
    result = OpenAIProvider(api_key="test-key").analyze_vulnerability(finding())
    assert result["status"] == "available"
    assert result["source_sha"] == "a" * 40
    assert result["validation"]["status"] == "passed"
    assert apply_unified_diff(SOURCE, result["fix"], "test.py") == UPDATED
    body = mock_post.call_args.kwargs["json"]
    assert body["response_format"]["json_schema"]["strict"] is True
    assert SOURCE in json.loads(body["messages"][1]["content"].split("\n", 1)[1])["source_content"]
    assert mock_post.call_args.kwargs["timeout"][1] >= 5


@patch("requests.post")
def test_missing_key_never_generates_a_fake_fix(mock_post):
    result = OpenAIProvider(api_key="").analyze_vulnerability(finding())
    assert result["status"] == "unavailable"
    assert result["fix"] == ""
    mock_post.assert_not_called()


@patch("requests.post")
def test_missing_snapshot_never_calls_provider(mock_post):
    result = OpenAIProvider(api_key="key").analyze_vulnerability({"file": "test.py", "line": 2})
    assert result["status"] == "unavailable"
    mock_post.assert_not_called()


@pytest.mark.parametrize("output", [
    response(finish="length"),
    response(refusal="Cannot provide this patch"),
    response(payload={"analysis": "Reason", "fix": "not a diff"}),
])
@patch("requests.post")
def test_incomplete_refused_or_invalid_patch_is_not_available(mock_post, output):
    mock_post.return_value = output
    result = OpenAIProvider(api_key="key").analyze_vulnerability(finding())
    assert result["status"] == "failed"
    assert result["fix"] == ""


@patch("providers.openai_provider.time.sleep")
@patch("requests.post")
def test_transient_failures_retry_with_bounded_backoff(mock_post, sleep):
    mock_post.side_effect = [response(status=429), response(status=503), response()]
    assert OpenAIProvider(api_key="key").analyze_vulnerability(finding())["status"] == "available"
    assert mock_post.call_count == 3
    assert [call.args[0] for call in sleep.call_args_list] == [1, 2]


@patch("providers.openai_provider.time.sleep")
@patch("requests.post")
def test_invalid_credentials_are_not_retried(mock_post, sleep):
    mock_post.return_value = response(status=401)
    result = OpenAIProvider(api_key="key").analyze_vulnerability(finding())
    assert result["status"] == "failed"
    assert mock_post.call_count == 1
    sleep.assert_not_called()
