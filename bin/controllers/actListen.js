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
const funcs_1 = require("../funcs");
const Enums_1 = require("@mazemasterjs/shared-library/Enums");
const MazeLoc_1 = __importDefault(require("@mazemasterjs/shared-library/MazeLoc"));
const GameLang_1 = __importDefault(require("../GameLang"));
const fns = __importStar(require("../funcs"));
const MAX_HEARING_DISTANCE = 10;
function doListenLocal(game, lang) {
    const method = `doListenLocal(${game.Id}, ${lang})`;
    funcs_1.logTrace(__filename, method, 'Entering');
    const cell = game.Maze.getCell(game.Player.Location);
    const engram = game.Actions[game.Actions.length - 1].engram;
    const data = GameLang_1.default.getInstance(lang);
    // get the local sounds
    if (!!(cell.Tags & Enums_1.CELL_TAGS.START)) {
        setSound(engram.north.hear, {
            sound: data.entities.lava.sound.adjective,
            volume: funcs_1.calculateIntensity(data.entities.lava.sound.intensity, 1, MAX_HEARING_DISTANCE),
        });
    }
    if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH)) {
        setSound(engram.south.hear, {
            sound: data.entities.exit.sound.adjective,
            volume: funcs_1.calculateIntensity(data.entities.cheese.sound.intensity, 1, MAX_HEARING_DISTANCE),
        });
    }
    //  loop through the cardinal directions in DIRS
    for (let pos = 0; pos < 4; pos++) {
        const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
        switch (dir) {
            case Enums_1.DIRS.NORTH: {
                if (cell.isDirOpen(Enums_1.DIRS.NORTH) && cell.Location.row - 1 >= 0) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row - 1, cell.Location.col));
                    doListenDirected(game, lang, nextCell, engram.north.hear, Enums_1.DIRS.SOUTH, 1);
                }
                break;
            }
            case Enums_1.DIRS.SOUTH: {
                if (cell.isDirOpen(Enums_1.DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row + 1, cell.Location.col));
                    doListenDirected(game, lang, nextCell, engram.south.hear, Enums_1.DIRS.NORTH, 1);
                }
                break;
            }
            case Enums_1.DIRS.EAST: {
                if (cell.isDirOpen(Enums_1.DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col + 1));
                    doListenDirected(game, lang, nextCell, engram.east.hear, Enums_1.DIRS.WEST, 1);
                }
                break;
            }
            case Enums_1.DIRS.WEST: {
                if (cell.isDirOpen(Enums_1.DIRS.WEST) && cell.Location.col - 1 >= 0) {
                    const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col - 1));
                    doListenDirected(game, lang, nextCell, engram.west.hear, Enums_1.DIRS.EAST, 1);
                }
                break;
            }
        } // end switch(dir)
    } // end for (pos<4)
}
exports.doListenLocal = doListenLocal;
/**
 *
 * @param game
 * @param lang
 * @param cell
 * @param engramDir the original direction from which the function is walking through, centered on the player
 * @param lastDirection used to make sure the function isn't checking going to the direction it just checked
 * @param distance how many cells from the first call of the function it is checking / depth of recursion
 */
function doListenDirected(game, lang, cell, engramDir, lastDirection, distance) {
    const data = GameLang_1.default.getInstance(lang);
    const method = `doListenDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
    funcs_1.logTrace(__filename, method, 'Entering');
    if (!!(cell.Tags & Enums_1.CELL_TAGS.START) && distance <= data.entities.lava.sound.intensity) {
        setSound(engramDir, {
            sound: data.entities.lava.sound.adjective,
            volume: funcs_1.calculateIntensity(data.entities.lava.sound.intensity, distance + 1, MAX_HEARING_DISTANCE),
        });
    }
    if (!!(cell.Tags & Enums_1.CELL_TAGS.FINISH) && distance <= data.entities.exit.sound.intensity) {
        setSound(engramDir, {
            sound: data.entities.exit.sound.adjective,
            volume: funcs_1.calculateIntensity(data.entities.exit.sound.intensity, distance + 1, MAX_HEARING_DISTANCE),
        });
    }
    hearMonsters(game, lang, cell, engramDir, distance);
    if (cell.Traps !== Enums_1.CELL_TRAPS.NONE) {
        for (let pos = 0; pos < 9; pos++) {
            const trapEnum = 1 << pos;
            const trapType = Enums_1.CELL_TRAPS[trapEnum];
            if (!!(cell.Traps & trapEnum)) {
                try {
                    const intensity = data.traps[trapType.toUpperCase()].sound.intensity;
                    const adjective = data.traps[trapType.toUpperCase()].sound.adjective;
                    // const intensityString = `data.entities.${trapType}.smell.intensity`;
                    // const adjectiveString = `data.entities.${trapType}.smell.adjective`;
                    // const intensity = eval(intensityString);  <-- very clever, but an unsafe operation that the linter opposes
                    // const adjective = eval(adjectiveString);  <-- very clever, but an unsafe operation that the linter opposes
                    if (distance <= intensity) {
                        setSound(engramDir, { sound: adjective, volume: funcs_1.calculateIntensity(intensity, distance, MAX_HEARING_DISTANCE) });
                    }
                }
                catch (err) {
                    funcs_1.logTrace(__filename, method, err);
                }
            } // end (!!(cell.Traps & trapEnum))
        } // end for(pos<9)}
    } // if (!!(cell.Traps & CELL_TRAPS.NONE))
    //  loop through the cardinal directions in DIRS
    if (distance < MAX_HEARING_DISTANCE) {
        for (let pos = 0; pos < 4; pos++) {
            const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
            switch (dir) {
                case Enums_1.DIRS.NORTH: {
                    if (cell.isDirOpen(Enums_1.DIRS.NORTH) && cell.Location.row - 1 >= 0 && lastDirection !== dir) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row - 1, cell.Location.col));
                        doListenDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.SOUTH, distance + 1);
                    }
                    break;
                }
                case Enums_1.DIRS.SOUTH: {
                    if (cell.isDirOpen(Enums_1.DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && lastDirection !== dir) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row + 1, cell.Location.col));
                        doListenDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.NORTH, distance + 1);
                    }
                    break;
                }
                case Enums_1.DIRS.EAST: {
                    if (cell.isDirOpen(Enums_1.DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && lastDirection !== dir) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col + 1));
                        doListenDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.WEST, distance + 1);
                    }
                    break;
                }
                case Enums_1.DIRS.WEST: {
                    if (cell.isDirOpen(Enums_1.DIRS.WEST) && cell.Location.col - 1 >= 0 && lastDirection !== dir) {
                        const nextCell = game.Maze.getCell(new MazeLoc_1.default(cell.Location.row, cell.Location.col - 1));
                        doListenDirected(game, lang, nextCell, engramDir, Enums_1.DIRS.EAST, distance + 1);
                    }
                    break;
                }
            } // end switch(dir)
        } // end for (pos<4)
    }
} // end doListenDirected
exports.doListenDirected = doListenDirected;
function hearMonsters(game, lang, cell, engramDir, distance) {
    const data = GameLang_1.default.getInstance(lang);
    const method = `hearMonsters(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${distance})`;
    fns.logTrace(__filename, method, 'Entering');
    if (!!(cell.Tags & Enums_1.CELL_TAGS.MONSTER)) {
        game.Monsters.forEach(monster => {
            const monsterType = Enums_1.MONSTER_TAGS[monster.getTag()];
            fns.logTrace(__filename, 'smellMonsters(): ', `${monster.getTag()}`);
            const adj = data.monsters[monsterType.toUpperCase()].sound.adjective;
            const int = data.monsters[monsterType.toUpperCase()].sound.intensity;
            if (monster.Location.equals(cell.Location) && int >= distance) {
                const str = fns.calculateIntensity(int, distance, MAX_HEARING_DISTANCE);
                setSound(engramDir, { sound: adj, volume: str });
            }
        });
    }
}
function setSound(sounds, sound) {
    if (sounds[0].sound === 'nothing') {
        sounds[0] = sound;
    }
    else {
        sounds.push(sound);
    }
}
//# sourceMappingURL=actListen.js.map