import * as routes from './routes';
import express from 'express';
import Config from './Config';

export const router = express.Router();

// load the service config
const config = Config.getInstance();

// map all of the common routes
router.get('/get', routes.listGames);
router.get('/get/:gameId', routes.getGame);
router.get('/count', routes.countGames);

router.get('/newSinglePlayer/:mazeId/:teamId/:botId', routes.createSinglePlayerGame);

// TODO: Remove this debugging route
router.get('/cache/dump', routes.dumpCache);

// map the live/ready probes
router.get('/probes/live', routes.livenessProbe);
router.get('/probes/ready', routes.readinessProbe);
