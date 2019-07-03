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
const fns = __importStar(require("../funcs"));
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const GameLang_1 = __importDefault(require("../GameLang"));
function doLook(game, langCode) {
    fns.logDebug(__filename, 'doLook()', 'Entering');
    const data = GameLang_1.default.getInstance(langCode);
    const startScore = game.Score.getTotalScore();
    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.look);
    return fns.finalizeAction(game, 1, startScore, langCode);
}
exports.doLook = doLook;
/**
 * Update the
 * @param game
 * @param langCode
 */
function doLookLocal(game, langCode) {
    const method = `doLookLocal(${game.Id}, ${langCode})`;
    fns.logDebug(__filename, method, 'Entering');
    const cell = game.Maze.getCell(game.Player.Location);
    const engram = game.Actions[game.Actions.length - 1].engram;
    const MAX_DISTANCE = 3; // TODO: Make a MAX_DISTANCE env var ?
    const OUT_OF_RANGE = 999; // Should this be 999? -1?  Something else?
    const data = GameLang_1.default.getInstance(langCode);
    //  loop through the cardinal directions in DIRS
    for (let pos = 0; pos < 4; pos++) {
        const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
        switch (dir) {
            case Enums_1.DIRS.NORTH:
                let nRow = cell.Location.row;
                while (nRow >= 0) {
                    const thisCell = game.Maze.Cells[nRow][cell.Location.col];
                    const distance = Math.abs(cell.Location.row - nRow);
                    // bail out if we hit max distance
                    if (distance > MAX_DISTANCE) {
                        setSee(engram.north.see, { sight: data.entities.darkness.sight.adjective, distance: OUT_OF_RANGE });
                        break;
                    }
                    // no exit north, report wall and stop travelling
                    if (!(thisCell.Exits & Enums_1.DIRS.NORTH)) {
                        setSee(engram.north.see, { sight: data.entities.wall.sight.adjective, distance });
                        break;
                    }
                    // at the entrance - report exit lava and stop travelling (OR YOU WILL DIE IN A FIRE!! AHHHH!!)
                    if (!!(thisCell.Tags & Enums_1.CELL_TAGS.START)) {
                        setSee(engram.north.see, { sight: data.entities.lava.sight.adjective, distance: distance + 1 }); // lava is just *outside* the maze
                        break;
                    }
                    nRow--;
                }
                break;
            case Enums_1.DIRS.SOUTH:
                let sRow = cell.Location.row;
                while (sRow <= game.Maze.Height) {
                    const thisCell = game.Maze.Cells[sRow][cell.Location.col];
                    const distance = Math.abs(sRow - cell.Location.row);
                    // bail out if we hit max distance
                    if (distance > MAX_DISTANCE) {
                        setSee(engram.south.see, { sight: data.entities.darkness.sight.adjective, distance: OUT_OF_RANGE });
                        break;
                    }
                    // no exit south, report wall and stop travelling
                    if (!(thisCell.Exits & Enums_1.DIRS.SOUTH)) {
                        setSee(engram.south.see, { sight: data.entities.wall.sight.adjective, distance });
                        break;
                    }
                    // at the exit - report exit and cheese, then stop travelling
                    if (!!(thisCell.Tags & Enums_1.CELL_TAGS.FINISH)) {
                        setSee(engram.south.see, { sight: data.entities.cheese.sight.adjective, distance: distance + 1 }); // cheese is just *outside* the maze
                        break;
                    }
                    sRow++;
                }
                break;
            case Enums_1.DIRS.EAST:
                let eCol = cell.Location.col;
                while (eCol <= game.Maze.Width) {
                    const thisCell = game.Maze.Cells[cell.Location.row][eCol];
                    const distance = Math.abs(eCol - cell.Location.col);
                    // bail out if we hit max distance
                    if (distance > MAX_DISTANCE) {
                        setSee(engram.east.see, { sight: data.entities.darkness.sight.adjective, distance: OUT_OF_RANGE });
                        break;
                    }
                    // no exit east, report wall and stop travelling
                    if (!(thisCell.Exits & Enums_1.DIRS.EAST)) {
                        setSee(engram.east.see, { sight: data.entities.wall.sight.adjective, distance });
                        break;
                    }
                    eCol++;
                }
                break;
            case Enums_1.DIRS.WEST:
                let wCol = cell.Location.col;
                while (wCol >= 0) {
                    const thisCell = game.Maze.Cells[cell.Location.row][wCol];
                    const distance = Math.abs(wCol - cell.Location.col);
                    // bail out if we hit max distance
                    if (distance > MAX_DISTANCE) {
                        setSee(engram.west.see, { sight: data.entities.darkness.sight.adjective, distance: OUT_OF_RANGE });
                        break;
                    }
                    // no exit west, report wall and stop travelling
                    if (!(thisCell.Exits & Enums_1.DIRS.WEST)) {
                        setSee(engram.west.see, { sight: data.entities.wall.sight.adjective, distance });
                        break;
                    }
                    wCol--;
                }
                break;
        } // end switch(dir)
    } // end for(pos)
} // end doLookLocal
exports.doLookLocal = doLookLocal;
/**
 * Update the given see array with given sight if see[0].sight is empty (as is the
 * case if new Engram()), otherwise push sight onto the see array.
 *
 * @param see
 * @param sight
 */
function setSee(see, sight) {
    if (see[0].sight === '') {
        see[0] = sight;
    }
    else {
        see.push(sight);
    }
}
//# sourceMappingURL=actLook.js.map