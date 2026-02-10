module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    testTimeout: 10000,
    verbose: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/*.test.js',
        '!src/server.js',
        '!src/main.js'
    ]
};
