import Logger from '@mazemasterjs/logger';

const log = Logger.getInstance();

export class Config {
  /**
   * Instantiate and/or returns class instance
   */
  public static getInstance(): Config {
    if (this.instance === undefined) {
      this.instance = new Config();
    }

    return this.instance;
  }

  // singleton instance reference
  private static instance: Config;

  public readonly HTTP_PORT_GAME: number;
  public readonly BASE_URL_GAME: string;
  public readonly EXT_URL_GAME: string;
  public readonly LOG_LEVEL: number;
  public readonly CACHE_SIZE_MAZES: number;
  public readonly CACHE_SIZE_GAMES: number;
  public readonly CACHE_SIZE_SCORES: number;
  public readonly CACHE_SIZE_TEAMS: number;
  public readonly CACHE_SIZE_TROPHIES: number;
  public readonly CACHE_LOAD_MAX_FAIL_PERCENT: number;
  public readonly CACHE_FREE_TARGET_PERCENT: number;
  public readonly CACHE_PRUNE_TRIGGER_PERCENT: number;
  public readonly SERVICE_MAZE: string;
  public readonly SERVICE_SCORE: string;
  public readonly SERVICE_TEAM: string;
  public readonly SERVICE_TROPHY: string;

  // singleton pattern - constructor is private, use static Config.getInstance()
  private constructor() {
    this.LOG_LEVEL = this.getVar('LOG_LEVEL', 'number');
    log.LogLevel = this.LOG_LEVEL;
    this.BASE_URL_GAME = this.getVar('BASE_URL_GAME', 'string');
    this.EXT_URL_GAME = this.getVar('EXT_URL_GAME', 'string');
    this.HTTP_PORT_GAME = this.getVar('HTTP_PORT_GAME', 'number');
    this.CACHE_SIZE_MAZES = this.getVar('CACHE_SIZE_MAZES', 'number');
    this.CACHE_SIZE_GAMES = this.getVar('CACHE_SIZE_GAMES', 'number');
    this.CACHE_SIZE_SCORES = this.getVar('CACHE_SIZE_SCORES', 'number');
    this.CACHE_SIZE_TEAMS = this.getVar('CACHE_SIZE_TEAMS', 'number');
    this.CACHE_SIZE_TROPHIES = this.getVar('CACHE_SIZE_TROPHIES', 'number');
    this.CACHE_LOAD_MAX_FAIL_PERCENT = this.getVar('CACHE_LOAD_MAX_FAIL_PERCENT', 'number');
    this.CACHE_FREE_TARGET_PERCENT = this.getVar('CACHE_FREE_TARGET_PERCENT', 'number');
    this.CACHE_PRUNE_TRIGGER_PERCENT = this.getVar('CACHE_PRUNE_TRIGGER_PERCENT', 'number');
    this.SERVICE_MAZE = this.getVar('SERVICE_MAZE', 'string');
    this.SERVICE_SCORE = this.getVar('SERVICE_SCORE', 'string');
    this.SERVICE_TEAM = this.getVar('SERVICE_TEAM', 'string');
    this.SERVICE_TROPHY = this.getVar('SERVICE_TROPHY', 'string');
  }

  /**
   * Gets and returns the value of the requested environment variable
   * as the given type.
   *
   * @param varName - the name of the environment variable to get
   * @param typeName - tye name of the type to return the value as (string | number)
   */
  private getVar = (varName: string, typeName: string): any => {
    const val = process.env[varName];

    // first see if the variable was found - if not, let's blow this sucker up
    if (val === undefined) {
      this.doError(`getVar(${varName}, ${typeName})`, 'Configuration Error', `Environment variable not set: ${varName}`);
    }

    // we have a value - log the good news
    log.info(__filename, `getVar(${varName}, ${typeName})`, `${varName}=${val}`);

    // convert to expect type and return
    switch (typeName) {
      case 'string': {
        return val;
      }
      case 'number': {
        return parseInt(val + '', 10); // this could blow up, but that's ok since we'd want it to
      }
      default: {
        // we only want numbers or strings...
        this.doError(`getVar(${varName}, ${typeName})`, 'Argument Error', `Invalid variable type name: ${typeName}. Try 'string' or 'number' instead.`);
      }
    }
  };

  /**
   * Wrapping log.error to clean things up a little
   *
   * @param method
   * @param title
   * @param message
   */
  private doError(method: string, title: string, message: string) {
    const err = new Error(message);
    log.error(__filename, method, title + ' ->', err);
    throw err;
  }
}

export default Config;
