class PatchGenerator:
    def generate(self, vulnerability: dict, ai_analysis: dict) -> dict:
        """Generate a patch based on vulnerability and AI analysis"""
        patch = {
            "id": f"{vulnerability.get('file')}_{vulnerability.get('line')}",
            "file": vulnerability.get("file"),
            "line": vulnerability.get("line"),
            "original_code": vulnerability.get("original_code", ""),
            "patched_code": ai_analysis.get("fix", ""),
            "explanation": ai_analysis.get("analysis", ""),
            "severity": vulnerability.get("severity")
        }
        return patch
    
    def apply_patch(self, file_path: str, patch: dict) -> bool:
        """Apply patch to file"""
        try:
            with open(file_path, 'r') as f:
                lines = f.readlines()
            
            line_num = patch["line"] - 1
            if 0 <= line_num < len(lines):
                lines[line_num] = patch["patched_code"] + "\n"
            
            with open(file_path, 'w') as f:
                f.writelines(lines)
            
            return True
        except Exception:
            return False
