import { Logger } from 'winston';
import { DatabaseWrapper } from 'wraps-base';
import { CacheWrapper } from 'wraps-cache';

import { configureCache } from './cache';
import { configureDb } from './db';
import { configureLogger } from './logger';

interface ModelConfiguration {
  dbConnector: DatabaseWrapper;
  cacheConnector?: CacheWrapper;
  logger?: Logger;
}

/** Cache middleware configuration */
export function configure(conf: ModelConfiguration) {
  if (conf.dbConnector) configureDb(conf.dbConnector);
  if (conf.cacheConnector) configureCache(conf.cacheConnector);
  if (conf.logger) configureLogger(conf.logger);
}

export { Model, getModel } from './model';
