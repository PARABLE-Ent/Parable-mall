export default {
  '*.{ts,tsx}': ['eslint --max-warnings 0', 'prettier --write'],
  '*.{json,md,yml,yaml,css}': ['prettier --write'],
};
