module.exports = {
    root: true,
    overrides: [
        {
            files: ['./src/**/*.ts'],
            parserOptions: {
                project: ['./tsconfig.json']
            },
        },
        {
            files: ['./tests/**/*.test.ts'],
            parserOptions: {
                project: ['./tsconfig.test.json']
            },
            rules: {
                '@typescript-eslint/quotes': 'off',
                'max-len': 'off',
            }
        },
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: ['./tsconfig.json']
    },
    plugins: [
        '@typescript-eslint',
    ],
    extends: [
        'airbnb-typescript',
    ],
    rules: {
        'no-nested-ternary': 'off',
        'max-len': [1, 160],
        '@typescript-eslint/object-curly-spacing': 'off',
        '@typescript-eslint/no-use-before-define': 'off',
        'indent': ['error', 4],
        '@typescript-eslint/indent': ['error', 4],
        'no-param-reassign': 'off',
        'import/prefer-default-export': 'off',
        '@typescript-eslint/quotes': 'off',
        'max-classes-per-file': 0,
        'class-methods-use-this': 0,
        'no-plusplus': 0,
    },
};
