"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("@mazemasterjs/logger");
const express_1 = __importDefault(require("express"));
const compression_1 = __importDefault(require("compression"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const Config_1 = require("./Config");
const Cache_1 = require("./Cache");
const os_1 = require("os");
const router_1 = require("./router");
// get logger &  config instances
const log = logger_1.Logger.getInstance();
const config = Config_1.Config.getInstance();
// declare the cache object - it'll be defined in startServer();
let cache;
// create express app and an HTTPServer reference
const app = express_1.default();
// declare cache and httpServer refs
let httpServer;
// let's ROCK this joint!
startServer();
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        // load caches first, then start the server
        // get cache instance (triggers data preload for mazes, teams, and trophies)
        yield initCache()
            .then(instance => {
            cache = instance;
            launchExpress();
        })
            .catch(initErr => {
            log.error(__filename, 'initCache()', 'Unable to initialize cache, aborting startup. Error ->', initErr);
            doShutdown();
        });
    });
}
/**
 * Async wrapper around Cache.getInstance() - forces express start to wait
 * until the data caches are ready
 */
function initCache() {
    return __awaiter(this, void 0, void 0, function* () {
        const cacheInstance = yield Cache_1.Cache.getInstance().catch(initError => {
            return Promise.reject(initError);
        });
        return Promise.resolve(cacheInstance);
    });
}
/**
 * APPLICATION ENTRY POINT
 */
function launchExpress() {
    log.debug(__filename, 'launchExpress()', 'Configuring express HTTPServer...');
    // allow cross-origin-resource-sharing
    app.use(cors_1.default());
    // enable http compression middleware
    app.use(compression_1.default());
    // enable bodyParser middleware for json
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    // have to do a little dance around bodyParser.json() to verify request body so that
    // errors can be captured, logged, and responded to cleanly
    app.use((req, res, next) => {
        body_parser_1.default.json({
            verify: addReqBody,
        })(req, res, err => {
            if (err) {
                log.error(__filename, 'app.bodyParser.json()', 'Error encountered while parsing json body.', err);
                res.status(500).json({ status: '400', message: `Unable to parse JSON Body : ${err.name} - ${err.message}` });
                return;
            }
            else {
                log.trace(__filename, `bodyParser(${req.url}, res, next).json`, 'bodyParser.json() completed successfully.');
            }
            next();
        });
    });
    // set up the base /game router
    app.use(config.BASE_URL_GAME, router_1.router);
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
        log.force(__filename, 'launchExpress()', `Express is listening -> http://${os_1.hostname}:${config.HTTP_PORT_GAME}${config.BASE_URL_GAME}`);
        log.force(__filename, 'launchExpress()', `[ GAME-SERVER ] is now LIVE and READY!'`);
    });
}
/**
 * Called by bodyParser.json() to allow handling of JSON errors in submitted
 * put/post document bodies.
 *
 * @param req
 * @param res
 * @param buf
 */
function addReqBody(req, res, buf) {
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
//# sourceMappingURL=server.js.map