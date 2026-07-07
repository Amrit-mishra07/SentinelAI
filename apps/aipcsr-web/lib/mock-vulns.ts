export const mockVulnerabilities = [
  {
    id: "vuln-1",
    file_path: "src/auth/login.py",
    rule_id: "B105",
    severity: "high",
    patch_status: "pending",
    created_at: new Date().toISOString()
  },
  {
    id: "vuln-2",
    file_path: "src/api/routes.py",
    rule_id: "B104",
    severity: "medium",
    patch_status: "applied",
    created_at: new Date().toISOString()
  }
];
