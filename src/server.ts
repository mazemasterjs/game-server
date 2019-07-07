import { Logger } from '@mazemasterjs/logger';
import express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import { Server } from 'http';
import cors from 'cors';
import basicAuth from 'express-basic-auth';
import { Config } from './Config';
import { Cache, CACHE_TYPES } from './Cache';
import { hostname } from 'os';
import { router } from './router';
import { IUser } from '@mazemasterjs/shared-library/Interfaces/IUser';
import { Security } from './Security';
import * as fns from './funcs';
import { MD5 as hash } from 'object-hash';
import { USER_ROLES } from '@mazemasterjs/shared-library/Enums';

// get logger &  config instances
const log = Logger.getInstance();
const security = Security.getInstance();
const config = Config.getInstance();

// declare the cache object - it'll be defined in startServer();
let cache: Cache;

// create express app and an HTTPServer reference
const app = express();

// declare cache and httpServer refs
let httpServer: Server;

// let's ROCK this joint!
startServer();

async function startServer() {
  // load caches first, then start the server
  // get cache instance (triggers data preload for mazes, teams, and trophies)
  await initCache()
    .then(instance => {
      cache = instance;
      launchExpress();
    })
    .catch(initErr => {
      log.error(__filename, 'initCache()', 'Unable to initialize cache, aborting startup. Error ->', initErr);
      doShutdown();
    });
}

/**
 * Async wrapper around Cache.getInstance() - forces express start to wait
 * until the data caches are ready
 */
async function initCache(): Promise<Cache> {
  const cacheInstance = await Cache.getInstance().catch(initError => {
    return Promise.reject(initError);
  });

  return Promise.resolve(cacheInstance);
}

/**
 * APPLICATION ENTRY POINT
 */
function launchExpress() {
  log.debug(__filename, 'launchExpress()', 'Configuring express HTTPServer...');

  // allow cross-origin-resource-sharing
  app.use(cors());

  // enable http compression middleware
  app.use(compression());

  app.use(
    basicAuth({
      authorizer: authUser,
      authorizeAsync: true,
      unauthorizedResponse: authFailed,
      challenge: false,
    }),
  );

  // enable bodyParser middleware for json
  app.use(bodyParser.urlencoded({ extended: true }));

  // have to do a little dance around bodyParser.json() to verify request body so that
  // errors can be captured, logged, and responded to cleanly
  app.use((req, res, next) => {
    bodyParser.json({
      verify: addReqBody,
    })(req, res, err => {
      if (err) {
        log.error(__filename, 'app.bodyParser.json()', 'Error encountered while parsing json body.', err);
        res.status(500).json({ status: '400', message: `Unable to parse JSON Body : ${err.name} - ${err.message}` });
        return;
      } else {
        log.trace(__filename, `bodyParser(${req.url}, res, next).json`, 'bodyParser.json() completed successfully.');
      }
      next();
    });
  });

  // set up the base /game router
  app.use(config.BASE_URL_GAME, router);

  // catch-all for unhandled requests
  app.get('/*', (req, res) => {
    log.debug(__filename, req.url, 'Invalid Route Requested -> ' + req.url);

    res.status(404).json({
      status: '404',
      message: 'Route not found: ' + req.path,
    });
  });

  // and start the httpServer - starts the service
  httpServer = app.listen(config.HTTP_PORT_GAME, () => {
    // sever is now listening - live probe should be active, but ready probe must wait for routes to be mapped.
    log.force(__filename, 'launchExpress()', `Express is listening -> http://${hostname}:${config.HTTP_PORT_GAME}${config.BASE_URL_GAME}`);
    log.force(__filename, 'launchExpress()', `[ GAME-SERVER ] is now LIVE and READY!'`);
  });
}

/**
 * Attempts to authenticate the given user against the users collection
 *
 * @param userName
 * @param password
 * @param callback
 */
async function authUser(userName: string, password: string, callback: any) {
  const method = `authUser(${userName}, [password masked])`;
  log.debug(__filename, method, `Authenticating credentials...`);

  const userCreds: IUser | null = security.getUserCreds(userName);
  if (userCreds !== null) {
    if (userCreds.pwHash !== hash(password)) {
      log.debug(__filename, method, 'Authentication Failed: Invalid password: ' + userCreds.userName);
      callback(null, false);
      return;
    } else {
      log.debug(__filename, method, `User credentials cached. User role is: ${USER_ROLES[userCreds.role]}`);
      callback(null, true);
      return;
    }
  }

  // credentials not cached - call the team->user service
  log.debug(__filename, method, `Credentials not cached, fetching from ${fns.getSvcUrl(CACHE_TYPES.TEAM)}/get/user?userName=${userName}`);

  const userDoc = await fns
    .doGet(`${fns.getSvcUrl(CACHE_TYPES.TEAM)}/get/user?userName=${userName}`)
    .then(userDocs => {
      return userDocs[0];
    })
    .catch(getUserErr => {
      callback(null, false);
    });

  if (userDoc) {
    if (userDoc.pwHash === hash(password)) {
      log.debug(__filename, method, `Authentication Succeeded: ${userDoc.userName} has role ${USER_ROLES[userDoc.role]}`);

      // update the user's last login time
      userDoc.lastLogin = Date.now();
      await fns.doPut(`${fns.getSvcUrl(CACHE_TYPES.TEAM)}/update/user`, userDoc).catch(userUpdateErr => {
        fns.logError(__filename, method, 'Unable to update lastLogin. -> ', userUpdateErr);
      });

      // stash the user record in the the authed user cache
      security.cacheAuthedUser(userDoc);

      // return success to auth middleware
      callback(null, true);
    } else {
      log.warn(__filename, method, 'Authentication Error - Invalid Password.');
      callback(null, false);
    }
  }
}

/**
 * Returns a simple auth failure message
 *
 * @param req
 */
function authFailed(req: any) {
  const method = `authFailed()`;
  if (req.auth) {
    log.trace(__filename, method, 'Authentication Failed: Access denied.');
    return `Authentication Failed. Access denied.`;
  } else {
    log.trace(__filename, method, 'Authentication Failed: No credentials provided.');
    return 'Missing credentials. Basic authorization header is required. Access denied.';
  }
}

/**
 * Called by bodyParser.json() to allow handling of JSON errors in submitted
 * put/post document bodies.
 *
 * @param req
 * @param res
 * @param buf
 */
function addReqBody(req: express.Request, res: express.Response, buf: Buffer) {
  req.body = buf.toString();
}

/**
 * Gracefully shut down the service
 */
function doShutdown() {
  log.force(__filename, 'doShutDown()', 'Service shutdown commenced.');
  if (httpServer) {
    log.force(__filename, 'doShutDown()', 'Shutting down HTTPServer...');
    httpServer.close();
  }

  log.force(__filename, 'doShutDown()', 'Exiting process...');
  process.exit(0);
}

/**
 * Watch for SIGINT (process interrupt signal) and trigger shutdown
 */
process.on('SIGINT', function onSigInt() {
  // all done, close the db connection
  log.force(__filename, 'onSigInt()', 'Got SIGINT - Exiting application...');
  doShutdown();
});

/**
 * Watch for SIGTERM (process terminate signal) and trigger shutdown
 */
process.on('SIGTERM', function onSigTerm() {
  // all done, close the db connection
  log.force(__filename, 'onSigTerm()', 'Got SIGTERM - Exiting application...');
  doShutdown();
});
