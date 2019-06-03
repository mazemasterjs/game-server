import * as routes from './routes';
import express from 'express';
import Config from './Config';

export const router = express.Router();

// load the service config
const config = Config.getInstance();

// map all of the common routes
router.get('/get/games', routes.listGames);
router.get('/count/games', routes.countGames);

router.get('/newSinglePlayer/:mazeId/:teamId/:botId', routes.createSinglePlayerGame);

// router.put('/insert', routes.insertDoc);
// router.delete('/delete/:docId', routes.deleteDoc);

// map the live/ready probes
router.get('/probes/live', routes.livenessProbe);
router.get('/probes/ready', routes.readinessProbe);
