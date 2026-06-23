import os
import pytest
from unittest.mock import patch, MagicMock

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scanner-core')))

from repo_cloner import RepoCloner
from engines.bandit_engine import BanditEngine

def test_repo_cloner_success():
    cloner = RepoCloner()
    # Mock subprocess.run to do nothing
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(returncode=0)
        temp_dir = cloner.clone("https://github.com/dummy/repo")
        
        assert os.path.exists(temp_dir)
        # Clean up
        cloner.cleanup_dir(temp_dir)
        assert not os.path.exists(temp_dir)

def test_bandit_engine_parsing():
    engine = BanditEngine()
    
    # Mock subprocess.run to return a fake JSON output
    fake_output = """
    {
        "results": [
            {
                "filename": "vuln.py",
                "line_number": 10,
                "issue_text": "Use of hardcoded password",
                "issue_severity": "HIGH"
            }
        ]
    }
    """
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = MagicMock(stdout=fake_output, returncode=1)
        result = engine.run("/tmp/dummy")
        
        assert result["engine"] == "bandit"
        assert len(result["vulnerabilities"]) == 1
        assert result["vulnerabilities"][0]["issue"] == "Use of hardcoded password"
        assert result["vulnerabilities"][0]["severity"] == "high"
