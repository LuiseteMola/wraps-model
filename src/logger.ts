import { Logger, logger as defaultLogger } from 'wraps-logger';

export function configureLogger(customLogger: Logger) {
  logger = customLogger;
}
export let logger: Logger = defaultLogger;
