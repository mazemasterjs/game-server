"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("@mazemasterjs/logger");
// set constant utility references
const log = logger_1.Logger.getInstance();
exports.listGames = (req, res) => {
    return res.status(200).json({ message: 'Games list will go here.' });
};
//# sourceMappingURL=routes.js.map