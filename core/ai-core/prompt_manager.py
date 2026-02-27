class PromptManager:
    PROMPTS = {
        "analyze": "Analyze this security vulnerability and provide a fix:\n{context}",
        "generate_patch": "Generate a security patch for:\n{vulnerability}",
        "explain": "Explain this vulnerability and its impact:\n{issue}"
    }
    
    @staticmethod
    def get_prompt(template: str, **kwargs) -> str:
        prompt = PromptManager.PROMPTS.get(template, "")
        return prompt.format(**kwargs)
    
    @staticmethod
    def add_context(prompt: str, context: str) -> str:
        return f"{prompt}\n\nContext: {context}"
