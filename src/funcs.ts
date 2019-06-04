import { AxiosResponse } from 'axios';
import { Cache, CACHE_TYPES } from './Cache';
import { LOG_LEVELS, Logger } from '@mazemasterjs/logger';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IGameStub } from '@mazemasterjs/shared-library/IGameStub';
import { Config } from './Config';
import axios from 'axios';
import { Team } from '@mazemasterjs/shared-library/Team';

const log = Logger.getInstance();
const config = Config.getInstance();

/**
 * Builds a standard response status message for logging
 *
 * @param url
 * @param res
 */
export function genResMsg(url: string, res: AxiosResponse): string {
  return `RESPONSE: status=${res.status}, statusText=${res.statusText}, elementCount=${res.data.length}, url=${url}`;
}

/**
 * Returns IGameStub versions of all games in the cache
 */
export function getGameStubs(): Array<IGameStub> {
  log.debug(__filename, 'getGameStubs()', 'Building array of game stubs.');
  const games: Array<Game> = Cache.use().fetchItems(CACHE_TYPES.GAME);
  const stubs = new Array<IGameStub>();

  for (const game of games) {
    stubs.push(game.getStub(config.EXT_URL_GAME));
  }
  log.debug(__filename, 'getGameStubs()', `Returning array with ${stubs.length} IGameStub items.`);
  return stubs;
}

/**
 * Returns just the service URL path
 */
export function trimUrl(url: string): string {
  const pos = url.indexOf('/api');
  return pos > 0 ? url.substr(pos) : '/';
}

/**
 * Returns the service url that backs the given cache type
 *
 * @param cacheType
 */
export function getSvcUrl(cacheType: CACHE_TYPES) {
  switch (cacheType) {
    case CACHE_TYPES.MAZE: {
      return config.SERVICE_MAZE;
    }
    case CACHE_TYPES.TEAM: {
      return config.SERVICE_TEAM;
    }
    case CACHE_TYPES.SCORE: {
      return config.SERVICE_SCORE;
    }
    case CACHE_TYPES.TROPHY: {
      return config.SERVICE_TROPHY;
    }
  }
}

/**
 * Returns true if the given botId exists in the given Team
 *
 * @param team
 * @param botId
 */
export function findBot(team: Team, botId: string) {
  const botIdx = team.Bots.findIndex(bot => {
    return bot.Id === botId;
  });

  return botIdx > -1;
}

/**
 * Returns data from the requested URL
 *
 * @param url string - Service API to request data from
 */
export async function doGet(url: string): Promise<any> {
  const method = `doGet(${trimUrl(url)})`;
  log.debug(__filename, method, `Requesting ${url}`);

  return await axios
    .get(url)
    .then(res => {
      log.debug(__filename, method, genResMsg(url, res));
      if (log.LogLevel === LOG_LEVELS.TRACE) {
        log.trace(__filename, method, 'Response Data: \r\n' + JSON.stringify(res.data));
      }
      return Promise.resolve(res.data);
    })
    .catch(axiosErr => {
      log.error(__filename, method, 'Error retrieving data ->', axiosErr);
      return Promise.reject(axiosErr);
    });
}

export async function getItem(cacheType: CACHE_TYPES, itemId: string) {
  const method = `getItem(${CACHE_TYPES[cacheType]}, ${itemId})`;

  log.debug(__filename, method, 'Fetching item from cache...');
  let cachedItem = await Cache.use()
    .fetchItem(cacheType, itemId)
    .catch(fetchErr => {
      log.warn(__filename, method, 'Fetch failed -> ' + fetchErr.message);
    });

  // didn't find it in the cache
  if (cachedItem !== undefined) {
    log.debug(__filename, method, 'Fetch successful, returning ' + cachedItem.Id);
    return Promise.resolve(cachedItem);
  } else {
    log.debug(__filename, method, 'Item not in cache, retrieving...');

    return await doGet(`${getSvcUrl(cacheType)}/get?id=${itemId}`)
      .then(itemArray => {
        // got the item, lets cache it!
        cachedItem = Cache.use().storeItem(cacheType, itemArray[0]);

        // and return so we can continue
        return Promise.resolve(cachedItem.item);
      })
      .catch(getError => {
        log.warn(__filename, method, `${getSvcUrl(cacheType)}/get?id=${itemId} failed -> ${getError.message}`);
        return Promise.reject(getError);
      });
  }
}
