module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:prettier/recommended',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.*'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'jsx-a11y', 'prettier'],
  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    'react-hooks/rules-of-hooks': 'error',
    'no-console': 'error',
    'prefer-destructuring': [
      'error',
      {
        array: true,
        object: true,
      },
      {
        enforceForRenamedProperties: false,
      },
    ],
    '@typescript-eslint/default-param-last': 'error',
    'jsx-a11y/label-has-associated-control': 'error',
    'max-len': [
      'error',
      {
        code: 140,
        ignorePattern: '^import\\W.*',
      },
    ],
    'prettier/prettier': 'error',
    'react-hooks/exhaustive-deps': 'error',
    'react/jsx-no-constructed-context-values': 'error',
    'react/self-closing-comp': 'error',
    'testing-library/no-node-access': 'error',
    'react/react-in-jsx-scope': 'off',
    'react/no-unescaped-entities': 'off',
  },
  overrides: [
    {
      files: ['**/**/*.test.{ts,tsx}'],
      extends: ['plugin:testing-library/react'],
      rules: {
        'testing-library/no-node-access': 'off',
      },
    },
  ],
};
