import { genResMsg, trimUrl } from './funcs';
import { MazeBase } from '@mazemasterjs/shared-library/MazeBase';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Game } from '@mazemasterjs/shared-library/Game';
import { Trophy } from '@mazemasterjs/shared-library/Trophy';
import axios from 'axios';
import GameConfig from './GameConfig';
import Logger, { LOG_LEVELS } from '@mazemasterjs/logger';
import Maze from '@mazemasterjs/shared-library/Maze';

// useful constants
const config: GameConfig = GameConfig.getInstance();
const log: Logger = Logger.getInstance();

export class Cache {
  // TODO: Need promise/callback to set ready state while caches are loading!!

  // intialization of singleton
  public static getInstance() {
    if (this.instance === undefined) {
      this.instance = new Cache();
    } else {
      return this.instance;
    }
  }

  // set instance variable
  private static instance: Cache;

  // initialize cache arrays
  private maze: Array<MazeBase> = new Array<MazeBase>();
  private team: Array<Team> = new Array<Team>();
  private score: Array<Score> = new Array<Score>();
  private game: Array<Game> = new Array<Game>();
  private trophy: Array<Trophy> = new Array<Trophy>();

  // private constructor
  private constructor() {
    this.loadCache(config.SERVICE_MAZE + '/get', 'maze')
      .then(count => {
        log.debug(__filename, 'constructor()', `${count} mazes cached.`);
      })
      .catch(error => {
        log.error(__filename, 'constructor()', 'Error loading maze cache ->', error);
      });
  }

  private async loadCache(url: string, arrayName: string): Promise<number> {
    const method = `loadCache(${trimUrl(url)}, ${arrayName})`;

    // set a reference to the actuall array we're filling
    const array = this.getArrayByName(arrayName);

    // we'll use this to capture errors from arrow functions
    let error;

    // get the data we need to cache from the service passed via the url parameter
    const data: any = await this.doGet(url).catch(getDataError => {
      log.error(__filename, method, 'Error requesting data ->', getDataError);
      error = getDataError;
    });

    // check for
    if (error !== undefined) {
      return Promise.reject(error);
    }

    // iterate through the elements in the returned json data array
    for (const ele of data) {
      let cacheable: any;

      // api/maze/get only returns stubs, so we have to make a second request
      // to get the full maze data that we need for the cache
      if (arrayName === 'maze') {
        cacheable = await this.doGet(url + `?id=${ele.id}`);
      }

      try {
        array.push(this.coerceData(cacheable[0], arrayName));
      } catch (coerceError) {
        log.warn(__filename, method, `Unable to coerce {${arrayName}.id:${ele.id}} into ${arrayName} class, skipping element.`);
      }
    }

    return Promise.resolve(array.length);
  }

  /**
   * Attempts to load raw JSON data into a specific class according to the given data type name
   *
   * @param data
   * @param dataType
   */
  private coerceData(data: any, dataType: string): any {
    log.debug(__filename, `coerceData([json data], ${dataType})`, 'Attempting to coerce JSON data into ' + dataType);
    if (log.LogLevel === LOG_LEVELS.TRACE) {
      log.trace(__filename, `coerceData([json data], ${dataType})`, JSON.stringify(data));
    }

    switch (dataType) {
      case 'maze': {
        return new MazeBase(data);
      }
      case 'team': {
        return new Team(data);
      }
      case 'trophy': {
        return new Trophy(data);
      }
    }
  }

  /**
   * Returns the requested array
   *
   * @param arrayName
   */
  private getArrayByName(arrayName: string): any {
    switch (arrayName) {
      case 'maze': {
        return this.maze;
      }
      case 'team': {
        return this.team;
      }
      case 'score': {
        return this.score;
      }
      case 'game': {
        return this.game;
      }
      case 'trophy': {
        return this.trophy;
      }
    }
  }

  /**
   * Returns data from the requested URL
   *
   * @param url string - Service API to request data from
   */
  private async doGet(url: string): Promise<any> {
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
}

export default Cache;
