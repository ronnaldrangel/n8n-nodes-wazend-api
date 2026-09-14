module.exports = {
	preset: 'ts-jest',
	modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/.upstream/'],
	testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist/', '<rootDir>/.upstream/'],
	testPathIgnorePatterns: ['node_modules/', "dist/"],
};
