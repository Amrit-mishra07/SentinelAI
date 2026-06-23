import pytest
from unittest.mock import patch, MagicMock

import sys
import os

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(base_dir, 'apps', 'aipcsr-worker'))
sys.path.insert(0, os.path.join(base_dir, 'apps', 'aipcsr-api'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'db-core'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'scanner-core'))
sys.path.insert(0, os.path.join(base_dir, 'core', 'ai-core'))

from tasks.scan_task import scan_repository
from tasks.ai_analysis_task import analyze_with_ai

@patch('session.SessionLocal')
@patch('orchestrator.ScannerOrchestrator')
def test_scan_repository_task(mock_orchestrator, mock_session_local):
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    
    mock_scan = MagicMock()
    mock_db.query().filter().first.return_value = mock_scan
    
    mock_orch_instance = MagicMock()
    mock_orchestrator.return_value = mock_orch_instance
    mock_orch_instance.scan.return_value = {
        "vulnerabilities": [
            {"issue": "test issue", "file": "test.py", "line": 10, "severity": "high", "engine": "bandit"}
        ]
    }
    
    with patch.object(scan_repository, 'update_state') as mock_update_state:
        result = scan_repository("test_scan_id", "https://github.com/test/test")
        
        assert result["status"] == "completed"
        assert result["vulnerabilities_found"] == 1
        assert "report_id" in result
        
        assert mock_db.add.called
        assert mock_db.commit.called
        assert mock_db.close.called
        
        mock_update_state.assert_called_with(state='PROGRESS', meta={'status': 'scanning'})

@patch('session.SessionLocal')
@patch('providers.openai_provider.OpenAIProvider')
def test_analyze_with_ai_task(mock_provider, mock_session_local):
    mock_db = MagicMock()
    mock_session_local.return_value = mock_db
    
    mock_vuln = MagicMock()
    mock_vuln.file_path = "test.py"
    mock_vuln.line_number = 10
    mock_vuln.message = "test issue"
    mock_vuln.severity.value = "high"
    mock_vuln.id = "vuln_1"
    
    mock_db.query().filter().all.return_value = [mock_vuln]
    
    mock_prov_instance = MagicMock()
    mock_provider.return_value = mock_prov_instance
    mock_prov_instance.analyze_vulnerability.return_value = {"analysis": "test fix"}
    
    with patch.object(analyze_with_ai, 'update_state') as mock_update_state:
        result = analyze_with_ai("report_1")
        
        assert result["report_id"] == "report_1"
        assert result["analysis_count"] == 1
        assert result["results"][0]["analysis"] == {"analysis": "test fix"}
        
        mock_db.close.called
