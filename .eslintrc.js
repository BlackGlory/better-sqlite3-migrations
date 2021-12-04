module.exports = {
  root: true
, parser: '@typescript-eslint/parser'
, plugins: [
    '@typescript-eslint'
  ]
, extends: [
    'eslint:recommended'
  , 'plugin:@typescript-eslint/recommended'
  ]
, rules: {
    'no-constant-condition': 'off'
  , 'no-async-promise-executor': 'off'
  , '@typescript-eslint/no-inferrable-types': 'off'
  , '@typescript-eslint/ban-types': 'off'
  , '@typescript-eslint/ban-ts-comment': 'off'
  }
}
