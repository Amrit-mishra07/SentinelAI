# CI/CD Configuration

This directory contains CI/CD pipeline configurations:

## GitHub Actions
Create `.github/workflows/` files for automated testing and deployment.

## Example Structure
```yaml
name: Test and Deploy
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: pytest
```

## GitLab CI / Jenkins
Add configuration files as needed for your CI/CD platform.
