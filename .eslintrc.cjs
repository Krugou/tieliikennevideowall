module.exports = {
  root: true,
  env: {
    browser: true,
    es2024: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'prettier'
  ],
  plugins: ['react', 'react-hooks', '@typescript-eslint', 'jsx-a11y', 'import'],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'warn',
    'import/no-unresolved': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'jsx-a11y/no-noninteractive-element-interactions': 'off',
    '@typescript-eslint/func-style': ['error', 'expression'],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'FunctionDeclaration',
        message: 'Use arrow functions instead of function declarations'
      },
      {
        selector: 'FunctionExpression',
        message: 'Use arrow functions instead of function expressions'
      }
    ]
  }
};
