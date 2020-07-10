/**
 * Our base Cache implementation
 * Extend this class with new implementations to create different cache types (in-memory, database, file system etc.)
 * @class
 */
export default class CacheBase {
  /**
     * @param {Object} options
     * @param {boolean} [options.useMemoryCache=true] Use an in-memory layer on top of this cache
     *  Avoid hitting databases too often
     *  Not useful if using any distributed setup where memory will be out-of-sync between processes
     * @param {(number|null)} [options.memoryCacheTimeout=null] Timeout for in-memory cache values
     *  Default is null, which will use the incoming ttl values for each key
     */
  constructor(options = {
    useMemoryCache: true,
    memoryCacheTimeout: null,
  }) {
    this.memoryLayerEnabled = options.useMemoryCache;
    this.memCache = {};
  }

  /**
     * Internal implementation of Get()
     * @abstract
     * @async
     * @private
     * @param {string} key Unique key name for this cache entry
     * @return {(Object|undefined)} Returns the object in the cache, or undefined if not present
     */
  async _get(key) {
    throw new Error('Missing Implementation CacheBase::_Get(key)');
  }

  /**
     * Internal implementation of Set()
     * @abstract
     * @async
     * @private
     * @param {string} key Unique key name for this cache entry
     * @param {Object} value
     * @param {number} ttl How long the cache entry should last in milliseconds
     */
  async _set(key, value, ttl) {
    throw new Error('Missing Implementation CacheBase::_Set(key, value, ttl)');
  }

  /**
     * Get a cached object
     * @public
     * @async
     * @param {string} key Unique key name for this cache entry
     * @return {(Object|undefined)} Returns the object in the cache, or undefined if not present
     */
  async get(key) {
    // our optional in-memory cache goes first
    if (this.memoryLayerEnabled) {
      const cacheEntry = this.memCache[key];
      if (cacheEntry !== undefined) {
        const now = +new Date();
        if (cacheEntry.expires >= now) {
          return cacheEntry.value;
        }
      }
    }

    // then use our internal cache if we haven't got the value stored locally
    return await this._get(key);
  }

  /**
     * Set a key in our cache
     * @public
     * @async
     * @param {string} key Unique key name for this cache entry
     * @param {Object} value
     * @param {(Function|number)} [ttl=3600000] How long the cache entry should last in milliseconds
     *  Can be a number or a function that will return a number
     *  Default 1 hour
     */
  async set(key, value, ttl = 3600000) {
    // resolve our cache time
    let cacheTime = ttl;
    // if our cache time input is a function, resolve it and store the result (in milliseconds)
    if (typeof cacheTime === 'function') {
      cacheTime = await cacheTime();
    }

    // optionally keep an in-memory cache layer
    if (this.memoryLayerEnabled) {
      const memoryCacheTime = this.memoryCacheTimeout === null ?
        cacheTime :
        (Math.min(this.memoryCacheTimeout, cacheTime)
        );

      this.cache[key] = {
        value,
        expires: (+new Date()) + memoryCacheTime,
      };
    }

    // call the private _Set implementation to actually set the key
    this._set(key, value, cacheTime);
  }

  /**
     * A helper "wrap" function that will return a cached value if present
     *  This will call the supplied function to fetch it if the value isn't present in the cache
     * @public
     * @async
     * @param {string} key Unique key name for this cache entry
     * @param {function} fn Fetch function that will be called if the cache entry is not present
     * @param {(function|number)} [ttl] How long the cache entry should last in milliseconds
     *  Can be a number or a function that will return a number
     */
  async wrap(key, fn, ttl) {
    // try and fetch the cached value
    let cachedValue = await this.get(key);

    // if not in our cache, call the supplied fetcher function
    if (cachedValue === undefined) {
      cachedValue = await fn();
      // set the new value in our cache
      await this.set(key, cachedValue, ttl);
    }

    // return the fetched or calculated value
    return cachedValue;
  }
}