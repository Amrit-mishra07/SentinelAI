// Never import executable configuration from a scanned repository.
import { createRequire } from 'node:module';
const require = createRequire('/opt/scanners/package.json');
const parser = require('@typescript-eslint/parser');
export default [
  { ignores: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'] },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: { parser, parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } } },
    rules: { 'no-eval': 'error', 'no-implied-eval': 'error', 'no-new-func': 'error' },
  },
];
