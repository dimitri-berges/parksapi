import { Destination } from '../destination.js';
import { attractionType, statusType, queueType, tagType, scheduleType, entityType } from '../parkTypes.js';
import moment from 'moment-timezone';

const queries = {
  getConfiguration: {
    "query": "query getConfiguration($language: String!) {\n  configuration(localeFilters: {locale: $language}) {\n    parkIsOpen\n    parkOpeningTime\n    parkClosingTime\n    parkText\n    parkInfoBanner\n    parkLatitude\n    parkLongitude\n    parkRadiusMeters\n    welcomeImage\n    mapColorShow\n    mapColorRestaurant\n    minimumVersionIos\n    minimumVersionAndroid\n    cloudinaryProxyUrl\n    enableMapDirections\n    enableBillet\n    enableFavoris\n    __typename\n  }\n  locales {\n    iso\n    label\n    __typename\n  }\n}\n"
  },
  getAttractions: {
    "query": "query getAttractions($language: String!) {\n  openAttractions(localeFilters: {locale: $language}, orderBy: [{field: TITLE, order: ASC}]) {\n    id\n    drupalId\n    title\n    slug\n    summary\n    description\n    experience {\n      id\n      drupalId\n      label\n      color\n      __typename\n    }\n    mapId\n    latitude\n    longitude\n    features {\n      id\n      label\n      value\n      icon\n      __typename\n    }\n    headerV1\n    thumbnailV1\n    headerV2\n    thumbnailV2\n    sliders {\n      picture\n      order\n      __typename\n    }\n    minAge\n    order\n    isNew\n    isBest\n    hasQueuingCut\n    hasQueuingCutFear\n    hasPicturePoint\n    blocks\n    labels\n    __typename\n  }\n}\n",
  },
  spectacles: {
    "query": "query spectacles($language: String!) {\n  openShows(localeFilters: {locale: $language}, orderBy: [{field: TITLE, order: ASC}]) {\n    id\n    drupalId\n    title\n    slug\n    summary\n    description\n    mapId\n    latitude\n    longitude\n    features {\n      label\n      value\n      icon\n      __typename\n    }\n    closingTimes {\n      startAt\n      endAt\n      timezone\n      __typename\n    }\n    headerV1\n    thumbnailV1\n    headerV2\n    thumbnailV2\n    sliders {\n      picture\n      order\n      __typename\n    }\n    minAge\n    order\n    isNew\n    isBest\n    schedules\n    scheduleIsFrom\n    blocks\n    labels\n    __typename\n  }\n}\n",
  },
  attractionLatency: {
    "query": "query attractionLatency {\n  attractionLatency {\n    drupalId\n    latency\n    closingTime\n    __typename\n  }\n}\n"
  },
  restaurants: {
    "query": "query restaurants($language: String!) {\n  restaurants(localeFilters: {locale: $language}, orderBy: [{field: TITLE, order: ASC}]) {\n    id\n    drupalId\n    title\n    slug\n    type\n    kind\n    kindDrupalId\n    theme\n    themeDrupalId\n    universe\n    mealType\n    withTerrace\n    summary\n    description\n    header\n    sliders {\n      picture\n      order\n      __typename\n    }\n    mapId\n    latitude\n    longitude\n    menuUrl\n    mobileUrl\n    related {\n      id\n      __typename\n    }\n    blocks\n    labels\n    __typename\n  }\n}\n",
  },
  getCalendar: {
    "query": "query getCalendar {\n  calendar {\n    day\n    times\n    type\n    __typename\n  }\n}\n",
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
    return this.makeCachedQuery('restaurants', '857561404b9f5c69e651d74e0f5c0403f5bd3bd02491a0958d11d60bd8526cc9');
  }

  /**
   * Get raw show data
   */
  async getShowData() {
    // cache for 6 hours
    '@cache|360';
    return this.makeCachedQuery('spectacles', 'a3a067a0edbfb3666228d5d966d5933b1572e271b4c7f2858ce1758a2490227e');
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

      entity._id = data.drupalId;

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
    return {
      ...this.buildBaseEntityObject(),
      _id: 'parcasterix',
      slug: 'parcasterix', // all destinations must have a unique slug
      name: 'Parc Asterix',
      entityType: entityType.destination,
      location: {
        // location is required and not available in API so hardcoded (hopefully the park don't move)
        longitude: 2.573816,
        latitude: 49.13675,
      },
    };
  }

  /**
   * Build the park entities for this destination
   */
  async buildParkEntities() {
    //const parkData = await this.getResortData();
    // Temporary workaround until the API is fixed
    const parkData = {
      data: { configuration: { longitude: 2.573816, latitude: 49.13675 } },
    };

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
          longitude: parkData.data.configuration.longitude || 2.573816,
          latitude: parkData.data.configuration.latitude || 49.136750,
        },
      }
    ];
  }

  /**
   * Build the attraction entities for this destination
   */
  async buildAttractionEntities() {
    // const attrs = await this.getAttractionData();
    // Temporary workaround until the API is fixed
    // Attractions are hardcoded for now
    // TODO: Remove hardcoded attractions when API is fixed
    const attrs = {
      data: {
        openAttractions: [
          {
            title: "La Glissade d'Obélix",
            drupalId: "485567",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Les jardins merveilleux du Père Noël",
            drupalId: "468931",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Tous en piste ! Le village de la glisse",
            drupalId: "338361",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Mission Perdue",
            drupalId: "471121",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "SOS Tournevis",
            drupalId: "70",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Les Chaudrons",
            drupalId: "648",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "La Petite Tempête",
            drupalId: "631",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Attention Menhir !",
            drupalId: "207809",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Les Espions de César",
            drupalId: "619",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Pégase Express",
            drupalId: "92214",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "L'Aventure Astérix",
            drupalId: "207878",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "L'Oxygénarium",
            drupalId: "645",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Le Vol d'Icare",
            drupalId: "636",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "L'Hydre de Lerne",
            drupalId: "639",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Epidemaïs Croisières",
            drupalId: "622",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "La Rivière d'Elis",
            drupalId: "625",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Les Petits Drakkars",
            drupalId: "13",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Les Chevaux du Roy",
            drupalId: "613",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Le Carrousel de César",
            drupalId: "616",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "La tour de Numérobis",
            drupalId: "475790",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Toutatis",
            drupalId: "461123",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Discobélix",
            drupalId: "63760",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Tonnerre 2 Zeus",
            drupalId: "10",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "La Galère",
            drupalId: "661",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Les Chaises Volantes",
            drupalId: "664",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "OzIris",
            drupalId: "25",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "La Trace du Hourra",
            drupalId: "12",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Goudurix",
            drupalId: "11",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Le Cheval de Troie",
            drupalId: "658",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Maison Hantée Catacombes",
            drupalId: "319617",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Maison Hantée Le tombeau des Dieux",
            drupalId: "468242",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Maison Hantée La Colère d'Anubis",
            drupalId: "113325",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "La forêt d'Idéfix",
            drupalId: "113358",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Les Chaudrons infernaux",
            drupalId: "482378",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Aire de jeux du Sanglier d'Or",
            drupalId: "461121",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Menhir Express",
            drupalId: "651",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Romus et Rapidus",
            drupalId: "69",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Maison Hantée Mission perdue",
            drupalId: "470928",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Maison Hantée Les Enfers de Pompei",
            drupalId: "480615",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
          {
            title: "Le Mini Carrousel",
            drupalId: "676",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Les Petites Chaises Volantes",
            drupalId: "670",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "L'Escadrille des As",
            drupalId: "673",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Lavomatix",
            drupalId: "2484",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Enigmatix",
            drupalId: "2482",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Hydrolix",
            drupalId: "2485",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Etamine",
            drupalId: "2486",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Aérodynamix",
            drupalId: "2483",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Le Petit Train",
            drupalId: "667",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Les Petits Chars tamponneurs",
            drupalId: "679",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Aire de jeux Viking",
            drupalId: "4848",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Aire de Jeux Panoramix",
            drupalId: "63762",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Aire de Jeux du Petit Chêne",
            drupalId: "63763",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "Chez Gyrofolix",
            drupalId: "461138",
            hasQueuingCut: false,
            __typename: "Attraction",
          },
          {
            title: "La revanche des pirates - Le Grand Splatch",
            drupalId: "26",
            hasQueuingCut: true,
            __typename: "Attraction",
          },
        ],
      },
    };

    return attrs.data.openAttractions
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
    return []; // Temporarily disabled until API is fixed
    const attrs = await this.getShowData();

    return [];

    // TODO - format shows when app returns some data
    return attrs.data.openShows.map((x) => {
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
    return []; // Temporarily disabled until API is fixed
    const attrs = await this.getRestaurantData();

    return attrs.data.restaurants.filter((x) => {
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
    const waitTimes = await this.getWaitTimeData();

    return waitTimes.data.paxLatencies.map((x) => {
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

      if (x.latency !== null) {
        if (x.latency.match(/^\d+$/)) {
          data.queue[queueType.standBy].waitTime = parseInt(x.latency, 10);
        } else {
          // Latency is not a number, so there is no waitTime
        }
      }

      return data;
    });
  }

  /**
   * Return schedule data for all scheduled entities in this destination
   * Eg. parks
   * @returns {array<object>}
   */
  async buildEntityScheduleData() {
    return [
      {
        _id: "parcasterixpark",
        schedule: [],
      },
    ]; // Temporarily disabled until API is fixed
    const calendarData = await this.getCalendarData();

    const dates = [];
    const matchHours = /(\d+)h - (\d+)h/;
    calendarData.data.calendar.forEach((x) => {
      x.times.split(' et ').forEach((times) => {
        const match = matchHours.exec(times);
        if (match) {
          const date = moment.tz(x.day, 'YYYY-MM-DD', this.config.timezone);
          date.set('minute', 0).set('hour', 0).set('second', 0).set('millisecond', 0);
          dates.push({
            date: x.day,
            type: "OPERATING",
            openingTime: date.clone().set('hour', parseInt(match[1], 10)).format(),
            closingTime: date.clone().set('hour', parseInt(match[2], 10)).format(),
          });
        }
      });
    });

    return [
      {
        _id: 'parcasterixpark',
        schedule: dates,
      },
    ];
  }
}
