class SeverityMapper:
    SEVERITY_LEVELS = {
        "critical": 5,
        "high": 4,
        "medium": 3,
        "low": 2,
        "info": 1
    }
    
    @staticmethod
    def map_to_standard(severity: str) -> str:
        """Map engine-specific severity to standard format"""
        severity_lower = severity.lower()
        if "critical" in severity_lower or severity_lower == "blocker":
            return "critical"
        elif "high" in severity_lower or severity_lower == "major":
            return "high"
        elif "medium" in severity_lower or severity_lower == "minor":
            return "medium"
        elif "low" in severity_lower:
            return "low"
        return "info"
    
    @staticmethod
    def get_score(severity: str) -> int:
        return SeverityMapper.SEVERITY_LEVELS.get(severity.lower(), 0)
