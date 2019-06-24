"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Engram_1 = require("@mazemasterjs/shared-library/Engram");
const GameLang_1 = require("../GameLang");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const MazeLoc_1 = __importDefault(require("@mazemasterjs/shared-library/MazeLoc"));
const logger_1 = __importDefault(require("@mazemasterjs/logger"));
const fns = __importStar(require("../funcs"));
const log = logger_1.default.getInstance();
function doLook(game, langCode) {
    const engram = new Engram_1.Engram();
    const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
    const action = game.Actions[game.Actions.length - 1];
    const preMoveScore = game.Score.getTotalScore();
    // Grab the appropriate engram file
    const playerLoc = new MazeLoc_1.default(game.Player.Location.row, game.Player.Location.col);
    // Look forward in the direcgtion the player is looking, and one cell in the periphery
    switch (game.Player.Facing) {
        case Enums_1.DIRS.NORTH: {
            engram.sight += `{${lookForward(game, langCode, cell, engram, Enums_1.DIRS.NORTH, 0).sight},`;
            engram.sight += `${lookForward(game, langCode, cell, engram, Enums_1.DIRS.EAST, 0, 2).sight},`;
            engram.sight += `${lookForward(game, langCode, cell, engram, Enums_1.DIRS.WEST, 0, 2).sight}}`;
            break;
        }
        case Enums_1.DIRS.EAST: {
            engram.sight += `{${lookForward(game, langCode, cell, engram, Enums_1.DIRS.NORTH, 0, 2).sight},`;
            engram.sight += `${lookForward(game, langCode, cell, engram, Enums_1.DIRS.EAST, 0).sight},`;
            engram.sight += `${lookForward(game, langCode, cell, engram, Enums_1.DIRS.SOUTH, 0, 2).sight}}`;
            break;
        }
        case Enums_1.DIRS.SOUTH: {
            engram.sight += `{${lookForward(game, langCode, cell, engram, Enums_1.DIRS.EAST, 0, 2).sight},`;
            engram.sight += `${lookForward(game, langCode, cell, engram, Enums_1.DIRS.SOUTH, 0).sight},`;
            engram.sight += `${lookForward(game, langCode, cell, engram, Enums_1.DIRS.WEST, 0, 2).sight}}`;
            break;
        }
        case Enums_1.DIRS.WEST: {
            engram.sight += `{${lookForward(game, langCode, cell, engram, Enums_1.DIRS.NORTH, 0, 2).sight},`;
            engram.sight += `${lookForward(game, langCode, cell, engram, Enums_1.DIRS.SOUTH, 0, 2).sight},`;
            engram.sight += `${lookForward(game, langCode, cell, engram, Enums_1.DIRS.WEST, 0).sight}}`;
            break;
        }
    } // end switch(game.Player.Facing)
    const testObj = JSON.parse(engram.sight);
    log.debug(__filename, 'JSON.parse(engram.sight): ', testObj);
    log.debug(__filename, 'JSON.stringify(testObj)', JSON.stringify(testObj));
    action.engram.sight = engram.sight;
    action.engram.smell = fns.smellJSON(game, langCode, cell, 0);
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
    let cellEmpty = true;
    const currentCell = game.Maze.Cells[cell.Location.row][cell.Location.col];
    let nextCell = currentCell;
    maxDistance = maxDistance === undefined ? 10 : maxDistance;
    // Gets the players direction and prepends the sight engram with the characters direction
    if (distance === 0) {
        engram.sight = `"${Enums_1.DIRS[dir]}" : [`;
    }
    // Looks to see if the current cell contains a trap
    if (!(currentCell.Traps === 0 && distance === 0) && distance < maxDistance) {
        const trapType = currentCell.Traps;
        switch (trapType) {
            case Enums_1.CELL_TRAPS.PIT: {
                if (data.entities.PIT.sight.intensity - distance * 10 >= 0) {
                    engram.sight += `"${data.entities.PIT.sight.adjective}",`;
                    cellEmpty = false;
                }
                break;
            }
            case Enums_1.CELL_TRAPS.MOUSETRAP: {
                if (data.entities.MOUSETRAP.sight.intensity - distance * 10 >= 0) {
                    engram.sight += `"${data.entities.MOUSETRAP.sight.adjective}",`;
                    cellEmpty = false;
                }
                break;
            }
            case Enums_1.CELL_TRAPS.TARPIT: {
                if (data.entities.TARPIT.sight.intensity - distance * 10 >= 0) {
                    engram.sight += `"${data.entities.TARPIT.sight.adjective}",`;
                    cellEmpty = false;
                }
                break;
            }
            case Enums_1.CELL_TRAPS.FLAMETHROWER: {
                if (data.entities.FLAMETHROWER.sight.intensity - distance * 10 >= 0) {
                    engram.sight += `"${data.entities.FLAMETHROWER.sight.adjective}",`;
                    cellEmpty = false;
                }
                break;
            }
            default:
                log.debug(__filename, 'lookForward(): ', 'Unidentified trap detected');
                break;
        }
    } // end if(!(currentCell.Traps === 0 && distance === 0) && distance < maxDistance)
    // Looks to see if there is an opening in the direction the character is facing, and if so looks into the next cell over
    if (currentCell.isDirOpen(dir) && distance * 10 <= data.entities.DARKNESS.sight.intensity && distance < maxDistance) {
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
        } // end switch(dir)
        // An empty cell yields no additional information
        if (cellEmpty && distance > 0 && distance <= maxDistance) {
            engram.sight += `"...",`;
        }
        engram = lookForward(game, lang, nextCell, engram, dir, ++distance, maxDistance);
    } // end if (currentCell.isDirOpen(dir) && distance * 10 <= data.entities.DARKNESS.sight.intensity && distance < maxDistance)
    else if (!currentCell.isDirOpen(dir) && distance < maxDistance) {
        if (cellEmpty && distance !== 0) {
            engram.sight += `"...",`;
        }
        engram.sight += `"${data.entities.wall.sight.adjective}"]`;
    }
    else {
        engram.sight += `"${data.entities.DARKNESS.sight.adjective}"]`;
    }
    return engram;
} // end lookForward()
exports.lookForward = lookForward;
//# sourceMappingURL=actLook.js.map