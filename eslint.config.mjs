import config from '@iobroker/eslint-config';

export default [
    ...config,
    {
        languageOptions: {
            parserOptions: {
                projectService: {
                    allowDefaultProject: ['*.mjs', '*.mts'],
                },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        ignores: [
            'admin/**/*',
            'widgets/**/*',
            'node_modules/**/*',
            'test/**/*',
            'build/**/*',
            // the front-ends are built separately and have their own tsconfig and eslint config
            'src-widgets/**/*',
            'src-devices/**/*',
            'src-webcomponents/**/*',
            'tmp/**/*',
            '.**/*',
        ],
    },
    {
        rules: {
            'jsdoc/require-jsdoc': 'off',
            'jsdoc/require-param': 'off',

            '@typescript-eslint/no-require-imports': 'off',
        },
    },
];
