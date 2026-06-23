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
        if not self.api_key:
            return {"analysis": "API key not configured", "fix": ""}
        
        prompt = PromptManager.get_prompt("analyze", context=str(vulnerability))
        
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 500
                }
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
            return {"error": str(e)}
        
        return {"analysis": "Could not analyze", "fix": ""}
