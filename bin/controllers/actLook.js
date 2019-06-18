"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
const GameLang_1 = require("../GameLang");
const Maze_1 = require("@mazemasterjs/shared-library/Maze");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const util_1 = require("util");
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
    engram.sight = "You see exits: " + game.Maze.Cells[game.Player.Location.row][game.Player.Location.col]; // lookForward(game, langCode, cell, engram, 0).sight;
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
function lookForward(game, lang, cell, engram, distance, data) {
    const log = logger_1.default.getInstance();
    let cellEmpty = true;
    // Makes a new maze  and maze locations so it can determine the next cell to look at later
    const maze = new Maze_1.Maze(game.Maze);
    const currentCell = new MazeLoc_1.default(cell.Location.row, cell.Location.col);
    let nextCell = new MazeLoc_1.default(cell.Location.row, cell.Location.col);
    // Gets the players direction and prefixs the sight engram with the characters direction
    const direction = game.Player.Facing;
    if (distance === 0) {
        engram.sight = `${Enums_1.DIRS[direction]}` + " : ";
    }
    log.debug(__filename, "DEBUG: engram.json: ", data.entities.BEARTRAP.sight.intensity);
    // Looks to see if the current cell contains a trap
    if (!(maze.getCell(currentCell).Traps === 0 && distance > 0)) {
        const trapType = Enums_1.CELL_TRAPS[maze.getCell(currentCell).Traps];
        switch (trapType) {
            case "PIT":
                {
                    if ((data.entities.PIT.sight.intensity - (distance * 10)) >= 0) {
                        engram.sight += data.entities.PIT.sight.adjective;
                        cellEmpty = false;
                    }
                    break;
                }
            case "BEARTRAP":
                {
                    if ((data.entities.BEARTRAP.sight.intensity - (distance * 10)) >= 0) {
                        engram.sight += data.entities.BEARTRAP.sight.adjective;
                        cellEmpty = false;
                    }
                    break;
                }
            case "TARPIT":
                {
                    if ((data.entities.TARPIT.sight.intensity - (distance * 10)) >= 0) {
                        engram.sight += data.entities.TARPIT.sight.adjective;
                        cellEmpty = false;
                    }
                    break;
                }
            case "FLAMETHOWER":
                {
                    if ((data.entities.FLAMETHOWER.sight.intensity - (distance * 10)) >= 0) {
                        engram.sight += data.entities.FLAMETHOWER.sight.adjective;
                        cellEmpty = false;
                    }
                    break;
                }
            default:
                log.debug(__filename, "lookForward(): ", "Unidentified trap detected");
                break;
        }
    }
    // Looks to see if there is an opening in the direction the character is facing, and if so looks into the next cell over
    if (maze.getCell(currentCell).isDirOpen(direction) && (distance * 10 <= data.entities.DARKNESS.sight.intensity)) {
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
        // An empty cell yields no additional information
        if (cellEmpty && distance > 0) {
            engram.sight += " ... ";
        }
        ;
        engram = lookForward(game, lang, maze.getCell(nextCell), engram, ++distance, data);
    }
    else if (!(maze.getCell(currentCell).isDirOpen(direction))) {
        engram.sight += data.entities.wall.sight.adjective;
    }
    else {
        engram.sight += data.entities.DARKNESS.sight.adjective;
    }
    return engram;
}
exports.lookForward = lookForward;
//# sourceMappingURL=actLook.js.map