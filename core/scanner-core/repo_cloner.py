import tempfile
import subprocess
import os
import shutil

class RepoCloner:
    def __init__(self):
        self.temp_dirs = []

    def clone(self, repo_url: str) -> str:
        """Clone a git repository to a temporary directory and return the path."""
        temp_dir = tempfile.mkdtemp(prefix="aipcsr_scan_")
        self.temp_dirs.append(temp_dir)
        
        try:
            subprocess.run(
                ["git", "clone", "--depth", "1", repo_url, temp_dir],
                capture_output=True,
                text=True,
                check=True
            )
            return temp_dir
        except subprocess.CalledProcessError as e:
            self.cleanup_dir(temp_dir)
            raise RuntimeError(f"Failed to clone repository: {e.stderr}")

    def cleanup_dir(self, temp_dir: str):
        """Remove a specific temporary directory."""
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
            if temp_dir in self.temp_dirs:
                self.temp_dirs.remove(temp_dir)

    def cleanup_all(self):
        """Remove all temporary directories created by this instance."""
        for temp_dir in self.temp_dirs[:]:
            self.cleanup_dir(temp_dir)
