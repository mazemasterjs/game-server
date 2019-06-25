"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
const GameLang_1 = require("../GameLang");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const MazeLoc_1 = __importDefault(require("@mazemasterjs/shared-library/MazeLoc"));
const logger_1 = __importDefault(require("@mazemasterjs/logger"));
const log = logger_1.default.getInstance();
function doLook(game, langCode) {
    const engram = new Engram_1.Engram();
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const preMoveScore = game.Score.getTotalScore();
    // Grab the appropriate engram file
    const playerLoc = new MazeLoc_1.default(game.Player.Location.row, game.Player.Location.col);
    const north = ['NORTH:'];
    const south = ['SOUTH:'];
    const east = ['EAST:'];
    const west = ['WEST:'];
    engram.sight.push(north);
    engram.sight.push(south);
    engram.sight.push(east);
    engram.sight.push(west);
    const northList = engram.sight[engram.sight.indexOf(north)];
    const southList = engram.sight[engram.sight.indexOf(south)];
    const eastList = engram.sight[engram.sight.indexOf(east)];
    const westList = engram.sight[engram.sight.indexOf(west)];
    // Look forward in the direcgtion the player is looking, and one cell in the periphery
    switch (game.Player.Facing) {
        case Enums_1.DIRS.NORTH: {
            lookForward(game, langCode, cell, northList, Enums_1.DIRS.NORTH, 0);
            lookForward(game, langCode, cell, eastList, Enums_1.DIRS.EAST, 0, 2);
            lookForward(game, langCode, cell, westList, Enums_1.DIRS.WEST, 0, 2);
            lookForward(game, langCode, cell, southList, Enums_1.DIRS.SOUTH, 0, 2);
            break;
        }
        case Enums_1.DIRS.EAST: {
            lookForward(game, langCode, cell, northList, Enums_1.DIRS.NORTH, 0, 2);
            lookForward(game, langCode, cell, eastList, Enums_1.DIRS.EAST, 0);
            lookForward(game, langCode, cell, southList, Enums_1.DIRS.SOUTH, 0, 2);
            lookForward(game, langCode, cell, westList, Enums_1.DIRS.WEST, 0, 2);
            break;
        }
        case Enums_1.DIRS.SOUTH: {
            lookForward(game, langCode, cell, eastList, Enums_1.DIRS.EAST, 0, 2);
            lookForward(game, langCode, cell, southList, Enums_1.DIRS.SOUTH, 0);
            lookForward(game, langCode, cell, westList, Enums_1.DIRS.WEST, 0, 2);
            lookForward(game, langCode, cell, northList, Enums_1.DIRS.NORTH, 0, 2);
            break;
        }
        case Enums_1.DIRS.WEST: {
            lookForward(game, langCode, cell, northList, Enums_1.DIRS.NORTH, 0, 2);
            lookForward(game, langCode, cell, southList, Enums_1.DIRS.SOUTH, 0, 2);
            lookForward(game, langCode, cell, westList, Enums_1.DIRS.WEST, 0);
            lookForward(game, langCode, cell, eastList, Enums_1.DIRS.EAST, 0, 2);
            break;
        }
    } // end switch(game.Player.Facing)
    action.engram.sight = engram.sight;
    // action.engram.sound = fns.getSound(game, langCode, cell);
    if (cell.Location.equals(game.Maze.StartCell)) {
        action.outcomes.push('You see the entrace filled with lava');
        action.outcomes.push('North is lava');
    }
    // track the score change from this one move
    action.score = game.Score.getTotalScore() - preMoveScore;
    // TODO: text render - here now just for DEV/DEBUG purposes
    action.outcomes.push(game.Maze.generateTextRender(true, game.Player.Location));
    return action;
}
exports.doLook = doLook;
function lookForward(game, lang, cell, engram, dir, distance, maxDistance) {
    const log = logger_1.default.getInstance();
    const data = GameLang_1.GameLang.getInstance(lang);
    const currentCell = game.Maze.Cells[cell.Location.row][cell.Location.col];
    let nextCell = currentCell;
    maxDistance = maxDistance === undefined ? 10 : maxDistance;
    // Gets the players direction and prepends the sight engram with the characters direction
    if (currentCell.Traps === 0 && !(distance === 0)) {
        engram.push('EMPTY');
    }
    if (!!(currentCell.Tags & Enums_1.CELL_TAGS.START) && dir === Enums_1.DIRS.NORTH) {
        engram.push(data.entities.lava.sight.adjective);
        return engram;
    }
    if (!!(currentCell.Tags & Enums_1.CELL_TAGS.FINISH) && dir === Enums_1.DIRS.SOUTH) {
        engram.push(data.entities.cheese.sight.adjective);
        return engram;
    }
    // Looks to see if the current cell contains a trap
    if (!(currentCell.Traps === 0 && distance === 0) && distance < maxDistance) {
        if (!!(currentCell.Traps & Enums_1.CELL_TRAPS.PIT)) {
            engram.push(data.entities.PIT.sight.adjective);
        }
        if (!!(currentCell.Traps & Enums_1.CELL_TRAPS.FLAMETHROWER)) {
            engram.push(data.entities.FLAMETHROWER.sight.adjective);
        }
        if (!!(currentCell.Traps & Enums_1.CELL_TRAPS.TARPIT)) {
            engram.push(data.entities.TARPIT.sight.adjective);
        }
        if (!!(currentCell.Traps & Enums_1.CELL_TRAPS.MOUSETRAP)) {
            engram.push(data.entities.MOUSETRAP.sight.adjective);
        }
    } // end if(!(currentCell.Traps === 0 && distance === 0) && distance < maxDistance)
    // Looks to see if there is an opening in the direction the character is facing, and if so looks into the next cell over
    if (distance >= data.entities.DARKNESS.sight.intensity || distance >= maxDistance) {
        engram.push(data.entities.DARKNESS.sight.adjective);
    }
    else if (!currentCell.isDirOpen(dir)) {
        engram.push(data.entities.WALL.sight.adjective);
    }
    else {
        switch (dir) {
            case Enums_1.DIRS.NORTH:
                if (currentCell.Location.row - 1 >= 0) {
                    nextCell = game.Maze.Cells[currentCell.Location.row - 1][currentCell.Location.col];
                }
                break;
            case Enums_1.DIRS.EAST:
                if (currentCell.Location.col + 1 <= game.Maze.Width - 1) {
                    nextCell = game.Maze.Cells[currentCell.Location.row][currentCell.Location.col + 1];
                }
                break;
            case Enums_1.DIRS.SOUTH:
                if (currentCell.Location.row + 1 <= game.Maze.Height - 1) {
                    nextCell = game.Maze.Cells[currentCell.Location.row + 1][currentCell.Location.col];
                }
                break;
            case Enums_1.DIRS.WEST:
                if (currentCell.Location.col - 1 >= 0) {
                    nextCell = game.Maze.Cells[currentCell.Location.row][currentCell.Location.col - 1];
                }
                break;
            default:
                break;
        }
        lookForward(game, lang, nextCell, engram, dir, distance + 1, maxDistance);
    } // end if (currentCell.isDirOpen(dir))
    return engram;
} // end lookForward()
exports.lookForward = lookForward;
//# sourceMappingURL=actLook.js.map