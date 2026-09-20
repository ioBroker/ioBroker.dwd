import config from '@iobroker/eslint-config';

export default [
    ...config,
    {
        languageOptions: {
            parserOptions: {
                projectService: { allowDefaultProject: ['*.mjs', '*.ts'] },
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    { ignores: ['build/**/*', 'node_modules/**/*', '.**/*'] },
    { rules: { 'jsdoc/require-jsdoc': 'off', 'jsdoc/require-param': 'off' } },
];
