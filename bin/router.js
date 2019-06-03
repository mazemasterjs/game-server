"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const routes = __importStar(require("./routes"));
const express_1 = __importDefault(require("express"));
const Config_1 = __importDefault(require("./Config"));
exports.router = express_1.default.Router();
// load the service config
const config = Config_1.default.getInstance();
// map all of the common routes
exports.router.get('/get/games', routes.listGames);
exports.router.get('/count/games', routes.countGames);
exports.router.get('/newSinglePlayer/:mazeId/:teamId/:botId', routes.createSinglePlayerGame);
// router.put('/insert', routes.insertDoc);
// router.delete('/delete/:docId', routes.deleteDoc);
// map the live/ready probes
exports.router.get('/probes/live', routes.livenessProbe);
exports.router.get('/probes/ready', routes.readinessProbe);
//# sourceMappingURL=router.js.map