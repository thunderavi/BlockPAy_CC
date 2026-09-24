export default { testEnvironment: "node", setupFilesAfterEnv: ["<rootDir>/test/setup.js"], coverageDirectory: "coverage", collectCoverageFrom: ["src/**/*.js", "!src/server.js"], testTimeout: 60000 };
