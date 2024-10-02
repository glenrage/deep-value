module.exports = {
  env: {
    node: true,
    es6: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended', // Integrates Prettier with ESLint
  ],
  parserOptions: {
    ecmaVersion: 2020, // Allows for modern ECMAScript features
    sourceType: 'module',
  },
  rules: {
    'prettier/prettier': 'error', // Show Prettier errors as ESLint errors
    'no-unused-vars': 'warn', // Warn about unused variables
    'no-console': 'off', // Allows the use of console.log (good for server-side code)
  },
};
