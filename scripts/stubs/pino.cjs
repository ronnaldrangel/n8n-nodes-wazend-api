'use strict';

// Build-time stand-in for `pino`.
//
// `@devlikeapro/n8n-openapi-node` (a dev dependency that is compiled into the
// published bundle) requires `pino` and builds a `pino-pretty` transport. n8n
// Cloud rejects community node bundles that contain logging transports, worker
// threads, the `Function` constructor or Node.js globals, so the build aliases
// `pino` to this no-op logger. The node never reads the library logger, so no
// log output is lost.
const noop = () => {};

function createLogger() {
	const logger = function logger() {};
	for (const method of ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']) {
		logger[method] = noop;
	}
	logger.child = () => createLogger();
	logger.flush = noop;
	return logger;
}

createLogger.createLogger = createLogger;
createLogger.default = createLogger;

module.exports = createLogger;
