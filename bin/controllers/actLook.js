"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const MazeLoc_1 = __importDefault(require("@mazemasterjs/shared-library/MazeLoc"));
const logger_1 = __importDefault(require("@mazemasterjs/logger"));
const log = logger_1.default.getInstance();
function doLook(game, langCode, engram) {
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const preMoveScore = game.Score.getTotalScore();
    // Grab the appropriate engram file
    const playerLoc = new MazeLoc_1.default(game.Player.Location.row, game.Player.Location.col);
    const exitList = cell.listExits().split(', ');
    engram.north.see.pop();
    engram.south.see.pop();
    engram.east.see.pop();
    engram.west.see.pop();
    if (exitList.includes('NORTH')) {
        engram.north.see.push({ sight: 'exit', distance: 0 });
    }
    else {
        engram.north.see.push({ sight: 'wall', distance: 0 });
    }
    if (exitList.includes('SOUTH')) {
        engram.south.see.push({ sight: 'exit', distance: 0 });
    }
    else {
        engram.north.see.push({ sight: 'wall', distance: 0 });
    }
    if (exitList.includes('EAST')) {
        engram.east.see.push({ sight: 'exit', distance: 0 });
    }
    else {
        engram.north.see.push({ sight: 'wall', distance: 0 });
    }
    if (exitList.includes('WEST')) {
        engram.west.see.push({ sight: 'exit', distance: 0 });
    }
    else {
        engram.north.see.push({ sight: 'wall', distance: 0 });
    }
    action.engram = engram;
    // action.engram.sound = fns.getSound(game, langCode, cell);
    if (cell.Location.equals(game.Maze.StartCell)) {
        action.outcomes.push('You see the entrace filled with lava');
        action.outcomes.push('North is lava');
    }
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - preMoveScore;
    // TODO: text render - here now just for DEV/DEBUG purposes
    action.outcomes.push(game.Maze.generateTextRender(true, game.Player.Location));
    return engram;
}
exports.doLook = doLook;
//# sourceMappingURL=actLook.js.map