import * as routes from './routes';
import express from 'express';
import Config from './Config';

export const router = express.Router();

// load the service config
const config = Config.getInstance();

// existing games
router.get('/get', routes.listGames);
router.get('/get/:gameId', routes.getGame);

// new games
router.put('/new/:mazeId/:teamId/:botId', routes.createGame); // single-player
router.put('/new/:mazeId/:teamId/', routes.createGame); // multi-player

// utility
router.get('/count', routes.countGames);
router.get('/cache/dump', routes.dumpCache); // TODO: Remove this debugging route

// map the live/ready probes
router.get('/probes/live', routes.livenessProbe);
router.get('/probes/ready', routes.readinessProbe);
