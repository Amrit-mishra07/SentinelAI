import requests
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', 'apps', 'aipcsr-api'))

from app.config.settings import settings

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
            return {"analysis": "API key not configured", "patch": ""}
        
        prompt = f"""
        Analyze this vulnerability and provide a fix:
        File: {vulnerability.get('file')}
        Issue: {vulnerability.get('issue')}
        Severity: {vulnerability.get('severity')}
        
        Provide a concise fix.
        """
        
        try:
            response = requests.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 300
                }
            )
            
            if response.status_code == 200:
                return {
                    "analysis": response.json()["choices"][0]["message"]["content"],
                    "vulnerability_id": vulnerability.get('file') + ":" + str(vulnerability.get('line'))
                }
        except Exception as e:
            return {"error": str(e)}
        
        return {"analysis": "Could not analyze", "patch": ""}
