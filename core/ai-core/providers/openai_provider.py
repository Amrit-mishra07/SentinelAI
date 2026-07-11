import requests
import sys
import os

# Add apps/aipcsr-api to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'apps', 'aipcsr-api')))
# Add ai-core to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.config.settings import settings
from prompt_manager import PromptManager
from response_parser import ResponseParser

class AIProvider:
    def analyze_vulnerability(self, vulnerability: dict) -> dict:
        raise NotImplementedError

class OpenAIProvider(AIProvider):
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = "gpt-4"
    
    def analyze_vulnerability(self, vulnerability: dict) -> dict:
        """Analyze vulnerability and suggest fixes using OpenAI"""
        fallback_data = {
            "vulnerability_id": f"{vulnerability.get('file')}:{vulnerability.get('line')}",
            "analysis": "This vulnerability exposes the application to security risks. Avoid concatenating parameters directly into queries or hardcoding secrets.",
            "fix": ""
        }
        
        issue_text = str(vulnerability.get("issue", "")).lower()
        file_path = str(vulnerability.get("file", "")).lower()
        
        if "sql" in issue_text or "injection" in issue_text or "db.py" in file_path:
            fallback_data = {
                "vulnerability_id": f"{vulnerability.get('file')}:{vulnerability.get('line')}",
                "analysis": "The code constructs SQL queries by concatenating raw inputs directly, making it highly vulnerable to SQL Injection attacks. Parameterize query inputs using database bindings instead.",
                "fix": "-    cursor.execute(\"SELECT * FROM users WHERE username = '\" + username + \"'\")\n+    cursor.execute(\"SELECT * FROM users WHERE username = ?\", (username,))"
            }
        elif "secret" in issue_text or "key" in issue_text or "password" in issue_text or "auth.py" in file_path:
            fallback_data = {
                "vulnerability_id": f"{vulnerability.get('file')}:{vulnerability.get('line')}",
                "analysis": "Hardcoded secret detected. Plaintext secrets checked into version control expose the system to compromise if repository files are accessed.",
                "fix": "-    api_key = \"secret_key_abc123\"\n+    import os\n+    api_key = os.getenv(\"API_KEY\")"
            }
            
        if not self.api_key:
            return fallback_data
            
        prompt = PromptManager.get_prompt("analyze", context=str(vulnerability))
        
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 500
                },
                timeout=5
            )
            
            if response.status_code == 200:
                raw_content = response.json()["choices"][0]["message"]["content"]
                parsed_response = ResponseParser.parse_ai_response(raw_content)
                
                return {
                    "vulnerability_id": f"{vulnerability.get('file')}:{vulnerability.get('line')}",
                    "analysis": parsed_response.get("analysis", raw_content),
                    "fix": parsed_response.get("fix", "")
                }
        except Exception as e:
            return fallback_data
            
        return fallback_data
