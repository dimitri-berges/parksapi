import { Destination } from '../destination.js';
import { attractionType, statusType, queueType, tagType, scheduleType, entityType } from '../parkTypes.js';
import moment from 'moment-timezone';

const queries = {
  getConfiguration: {
    "query": "query getConfiguration {\n  getConfiguration {\n    park_latitude\n    park_longitude\n    park_radius_meters\n    __typename\n  }\n}\n"
  },
  getAttractions: {
    "query": "query getAttractions {\n  getAllAttractions {\n    drupal_id\n    title\n    experience\n    latitude\n    longitude\n    hasQueuingCut\n    universe\n    __typename\n  }\n}\n",
  },
  getSpectacles: {
    "query": "query getSpectacles {\n  getAllShows {\n    drupal_id\n    title\n    latitude\n    longitude\n    __typename\n  }\n}\n",
  },
  attractionLatency: {
    "query": "query attractionLatency {\n  paxLatencies {\n    drupalId\n    latency\n    openingTime\n    closingTime\n    isOpen\n    isTemporaryBlocked\n    __typename\n  }\n}\n"
  },
  spectaclesShowtime: {
    "query": "query spectaclesShowtime {\n  paxSchedules {\n    drupalId\n    times {\n    at\n    endAt\n    startAt\n    }\n    __typename\n  }\n}\n"
  },
  getRestaurants: {
    "query": "query getRestaurants {\n  getAllRestaurants {\n    drupal_id\n    title\n    type\n    kind\n    theme\n    with_terrace\n    summary\n    description\n    latitude\n    longitude\n    __typename\n  }\n}\n",
  },
  getCalendar: {
    "query": "query getCalendar {\n  getCalendar {\n    date\n    openingTime\n    closingTime\n    __typename\n  }\n}\n",
  },
}

export class ParcAsterix extends Destination {
  constructor(options = {}) {
    options.timezone = options.timezone || 'Europe/Paris';

    options.apiBase = options.apiBase || '';
    options.language = options.language || 'en';

    // bump cache version when we need to wipe our cached query state
    options.cacheVersion = options.cacheVersion || 2;

    super(options);

    if (!this.config.apiBase) throw new Error('Missing apiBase');
  }

  /**
   * Make a graphql query against the API using a query hash
   * @param {string} operationName 
   * @param {string} queryHash 
   * @returns {object}
   */
  async makeCachedQuery(operationName, queryHash) {
    const query = {
      operationName,
      variables: {
        language: this.config.language,
      },
    };

    if (queries[operationName]) {
      for (const k in queries[operationName]) {
        query[k] = queries[operationName][k];
      }
    } else {
      query.extensions = {
        persistedQuery: {
          version: 1,
          sha256Hash: queryHash,
        }
      };
    }

    const resp = (await this.http(
      'GET',
      `${this.config.apiBase}graphql`,
      query,
    )).body;

    if (resp?.errors) {
      if (resp.errors[0] && resp.errors[0].message) {
        throw new Error(`makeCachedQuery ${operationName} error: ${resp.errors[0].message}`);
      }
      throw new Error(`makeCachedQuery ${operationName} error: ${JSON.stringify(resp.errors)}`);
    }

    return resp;
  }

  /**
   * Get some key resort data
   */
  async getResortData() {
    // cache for 6 hours
    '@cache|360';
    return this.makeCachedQuery('getConfiguration', '765d8930f5d5a09ca39affd57e43630246b2fb683331e18938d5b2dba7cb8e8a');
  }

  /**
   * Get raw attraction data
   */
  async getAttractionData() {
    // cache for 6 hours
    '@cache|360';
    return this.makeCachedQuery('getAttractions', '5609363783d826ec6c460caa620e3ca28e651897febf6753159836ab72d8139b');
  }

  /**
   * Get raw wait time data
   */
  async getWaitTimeData() {
    '@cache|1';
    return this.makeCachedQuery('attractionLatency', '41154df6dc22d5444dcfa749b69f3f177a3736031b0ed675c1730e7c7dfc9894');
  }

  /**
   * Get raw calendar data
   */
  async getCalendarData() {
    // cache for 6 hours
    '@cache|360';
    return this.makeCachedQuery('getCalendar', '4981b5364f50dce42cfc579b6e5cbe144f8ef12e6a5d1a6c2e8681c99545f39e');
  }

  /**
   * Get raw restaurant data
   */
  async getRestaurantData() {
    // cache for 6 hours
    '@cache|360';
    return this.makeCachedQuery('getRestaurants', '857561404b9f5c69e651d74e0f5c0403f5bd3bd02491a0958d11d60bd8526cc9');
  }

  /**
   * Get raw show data
   */
  async getShowData() {
    // cache for 6 hours
    '@cache|360';
    return this.makeCachedQuery('getSpectacles', 'a3a067a0edbfb3666228d5d966d5933b1572e271b4c7f2858ce1758a2490227e');
  }

  /**
   * Get raw showtime data
   */
  async getShowtimeData() {
    // cache for 6 hours
    '@cache|360';
    return this.makeCachedQuery('spectaclesShowtime', 'a3a067a0edbfb3666228d5d966d5933b1572e271b4c7f2858ce1758a2490227e');
  }

  /**
   * Helper function to build a basic entity document
   * Useful to avoid copy/pasting
   * @param {object} data 
   * @returns {object}
   */
  buildBaseEntityObject(data) {
    const entity = Destination.prototype.buildBaseEntityObject.call(this, data);

    if (data) {
      entity.name = data.title || undefined;

      entity._id = data.drupal_id;

      if (data.latitude && data.longitude) {
        entity.location = {
          latitude: data.latitude,
          longitude: data.longitude,
        };
      }

      entity.fastPass = !!data.hasQueuingCut;
    }

    return entity;
  }

  /**
   * Build the destination entity representing this destination
   */
  async buildDestinationEntity() {
    const parkData = await this.getResortData();

    return {
      ...this.buildBaseEntityObject(),
      _id: 'parcasterix',
      slug: 'parcasterix', // all destinations must have a unique slug
      name: 'Parc Asterix',
      entityType: entityType.destination,
      location: {
        longitude: parkData.data.getConfiguration.park_longitude || 2.573816,
        latitude: parkData.data.getConfiguration.park_latitude || 49.136750,
      },
    };
  }

  /**
   * Build the park entities for this destination
   */
  async buildParkEntities() {
    const parkData = await this.getResortData();

    return [
      {
        ...this.buildBaseEntityObject(null),
        _id: 'parcasterixpark',
        _destinationId: 'parcasterix',
        _parentId: 'parcasterix',
        slug: 'ParcAsterixPark',
        name: 'Parc Asterix',
        entityType: entityType.park,
        location: {
          longitude: parkData.data.getConfiguration.park_longitude || 2.573816,
          latitude: parkData.data.getConfiguration.park_latitude || 49.136750,
        },
      }
    ];
  }

  /**
   * Build the attraction entities for this destination
   */
  async buildAttractionEntities() {
    const attrs = await this.getAttractionData();

    return attrs.data.getAllAttractions
      .filter((x) => {
        return x.__typename === "Attraction";
      })
      .map((x) => {
        return {
          ...this.buildBaseEntityObject(x),
          entityType: entityType.attraction,
          attractionType: attractionType.ride,
          _destinationId: "parcasterix",
          _parentId: "parcasterixpark",
          _parkId: "parcasterixpark",
        };
      })
      .filter((x) => {
        return !!x && x._id;
      });
  }

  /**
   * Build the show entities for this destination
   */
  async buildShowEntities() {
    const attrs = await this.getShowData();

    return attrs.data.getAllShows
      .map((x) => {
        return {
          ...this.buildBaseEntityObject(x),
          entityType: entityType.show,
          _destinationId: 'parcasterix',
          _parentId: 'parcasterixpark',
          _parkId: 'parcasterixpark',
        };
      }).filter((x) => {
        return !!x && x._id;
      });
  }

  /**
   * Build the restaurant entities for this destination
   */
  async buildRestaurantEntities() {
    const attrs = await this.getRestaurantData();

    return attrs.data.getAllRestaurants
      .filter((x) => {
        return x.__typename === 'Restaurant';
      }).map((x) => {
        return {
          ...this.buildBaseEntityObject(x),
          entityType: entityType.restaurant,
          _destinationId: 'parcasterix',
          _parentId: 'parcasterixpark',
          _parkId: 'parcasterixpark',
        };
      }).filter((x) => {
        return !!x && x._id;
      });
  }

  /**
   * @inheritdoc
   */
  async buildEntityLiveData() {
    const latencies = await this.getWaitTimeData();

    const waitTimes = latencies.data.paxLatencies.map((x) => {
      const data = {
        _id: x.drupalId,
      };

      // 2024-11-14 Due to changes in Parc Asterix's API,
      // status can be determined from booleans and separated from latency value

      data.status = x.isOpen ?
        statusType.operating :
        x.isTemporaryBlocked ?
        statusType.down :
        statusType.closed;

      data.queue = {
        [queueType.standBy]: {
          waitTime: null,
        },
      };

      data.queue[queueType.standBy].waitTime = x.latency;

      return data;
    });

    const shows = await this.getShowtimeData();

    const showTimes = shows.data.paxSchedules.map((x) => {
      const data = {
        _id: x.drupalId,
      };

      data.status = statusType.operating;

      data.schedule = x.times.map((time) => {
        if (time.at)
          return {
            type: scheduleType.operating,
            startTime: moment.tz(`${moment().format('YYYY-MM-DD')}T${time.at}`, 'YYYY-MM-DDTHH:mm:ss', this.config.timezone).format(),
            endTime: moment.tz(`${moment().format('YYYY-MM-DD')}T${time.at}`, 'YYYY-MM-DDTHH:mm:ss', this.config.timezone).format(),
          };
        return {
          type: scheduleType.operating,
          startTime: moment.tz(`${moment().format('YYYY-MM-DD')}T${time.startAt}`, 'YYYY-MM-DDTHH:mm:ss', this.config.timezone).format(),
          endTime: moment.tz(`${moment().format('YYYY-MM-DD')}T${time.endAt}`, 'YYYY-MM-DDTHH:mm:ss', this.config.timezone).format(),
        };
      });

      return data;
    });

    return waitTimes.concat(showTimes);
  }

  /**
   * Return schedule data for all scheduled entities in this destination
   * Eg. parks
   * @returns {array<object>}
   */
  async buildEntityScheduleData() {
    const calendarData = await this.getCalendarData();

    const dates = calendarData.data.getCalendar
      .map((x) => {
        return {
            date: x.date,
            type: scheduleType.operating,
            openingTime: moment.tz(`${x.date}T${x.openingTime}`, this.config.timezone).format(),
            closingTime: moment.tz(`${x.date}T${x.closingTime}`, this.config.timezone).format(),
          }
      });

    return [
      {
        _id: 'parcasterixpark',
        schedule: dates,
      },
    ];
  }
}
