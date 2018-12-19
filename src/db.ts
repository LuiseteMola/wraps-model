import { DatabaseWrapper } from 'wraps-base';
export function configureDb(connector: DatabaseWrapper) {
  this.db = connector;
}

export let db: DatabaseWrapper;
