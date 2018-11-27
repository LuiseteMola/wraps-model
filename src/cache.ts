import { CacheWrapper } from 'wraps-cache';
export function configureCache (connector: CacheWrapper) {
    this.cache = connector;
}


export let cache: CacheWrapper = new CacheWrapper();