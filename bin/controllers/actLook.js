"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
const util_1 = require("util");
const GameLang_1 = require("../GameLang");
const Maze_1 = require("@mazemasterjs/shared-library/Maze");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const MazeLoc_1 = __importDefault(require("@mazemasterjs/shared-library/MazeLoc"));
const logger_1 = __importDefault(require("@mazemasterjs/logger"));
function doLook(game, langCode) {
    const engram = new Engram_1.Engram();
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const preMoveScore = game.Score.getTotalScore();
    const lang = GameLang_1.GameLang.getInstance(langCode);
    const maze = new Maze_1.Maze(game.Maze);
    const playerLoc = new MazeLoc_1.default(game.Player.Location.row, game.Player.Location.col);
    engram.sight = game.Player.Facing + " : " + lookForward(game, langCode, cell, engram, 0).sight;
    engram.smell = lang.actions.engrams.smell + lang.nothing;
    engram.touch = lang.actions.engrams.touch + lang.nothing;
    engram.taste = lang.actions.engrams.taste + lang.nothing;
    engram.sound = lang.actions.engrams.sound + lang.nothing;
    action.engram = engram;
    if (cell.Location.equals(game.Maze.StartCell)) {
        action.outcomes.push(util_1.format(lang.actions.engramDescriptions.sight.local.exit, cell.listExits()));
        action.outcomes.push(util_1.format(lang.actions.outcome.entrance, Enums_1.DIRS[Enums_1.DIRS.NORTH]));
    }
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - preMoveScore;
    // TODO: text render - here now just for DEV/DEBUG purposes
    action.outcomes.push(maze.generateTextRender(true, game.Player.Location));
    return action;
}
exports.doLook = doLook;
function lookForward(game, lang, cell, engram, distance) {
    let engramNext = new Engram_1.Engram;
    const log = logger_1.default.getInstance();
    if (distance === 0) {
        engramNext.sight = game.Player.Facing + " : ";
    }
    engramNext.sight = "";
    const file = path_1.default.resolve(`./data/engram.json`);
    const data = JSON.parse(fs_1.default.readFileSync(file, 'UTF-8'));
    const direction = game.Player.Facing;
    const maze = new Maze_1.Maze(game.Maze);
    const lookCell = new MazeLoc_1.default(cell.Location.row, cell.Location.col);
    let nextCell = new MazeLoc_1.default(cell.Location.row, cell.Location.col);
    if (maze.getCell(lookCell).isDirOpen(direction)) {
        switch (direction) {
            case Enums_1.DIRS.NORTH:
                nextCell = new MazeLoc_1.default(cell.Location.row - 1, cell.Location.col);
                break;
            case Enums_1.DIRS.EAST:
                nextCell = new MazeLoc_1.default(cell.Location.row, cell.Location.col + 1);
                break;
            case Enums_1.DIRS.SOUTH:
                nextCell = new MazeLoc_1.default(cell.Location.row + 1, cell.Location.col);
                break;
            case Enums_1.DIRS.WEST:
                nextCell = new MazeLoc_1.default(cell.Location.row, cell.Location.col - 1);
                break;
            default:
                break;
        }
        engramNext.sight += "[OPEN]";
        engramNext = lookForward(game, lang, maze.getCell(nextCell), engramNext, distance++);
    }
    else // if (!(game.Maze.getCell(lookCell).isOpen(direction)) && ((data.entities.wall.sight.intensity/10)< distance))
     {
        engram.sight += data.entities.wall.sight.adjective;
    }
    engram.sight += engramNext.sight;
    return engram;
}
exports.lookForward = lookForward;
//# sourceMappingURL=actLook.js.map