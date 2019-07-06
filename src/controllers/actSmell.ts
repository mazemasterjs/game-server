import * as fns from '../funcs';
import { CELL_TAGS, CELL_TRAPS, DIRS } from '@mazemasterjs/shared-library/Enums';
import { Game } from '@mazemasterjs/shared-library/Game';
import { ISight, ISmell } from '@mazemasterjs/shared-library/Interfaces/ISenses';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import CellBase from '@mazemasterjs/shared-library/CellBase';
import GameLang from '../GameLang';

export function doSmellLocal(game: Game, lang: string) {
  const method = `doSmellLocal(${game.Id}, ${lang})`;
  fns.logDebug(__filename, method, 'Entering');
  const cell = game.Maze.getCell(game.Player.Location);
  const engram = game.Actions[game.Actions.length - 1].engram;
  const data = GameLang.getInstance(lang);
  // get the local sounds
  if (!!(cell.Tags & CELL_TAGS.START)) {
    setSmell(engram.north.smell, { scent: data.entities.lava.smell.adjective, strength: data.entities.lava.smell.intensity });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH)) {
    setSmell(engram.south.smell, { scent: data.entities.exit.smell.adjective, strength: data.entities.exit.smell.intensity });
  }

  //  loop through the cardinal directions in DIRS
  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
    switch (dir) {
      case DIRS.NORTH: {
        if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
          doSmellDirected(game, lang, nextCell, engram.north.smell, DIRS.SOUTH, 1);
        }
        break;
      }
      case DIRS.SOUTH: {
        if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
          doSmellDirected(game, lang, nextCell, engram.south.smell, DIRS.NORTH, 1);
        }
        break;
      }
      case DIRS.EAST: {
        if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
          doSmellDirected(game, lang, nextCell, engram.east.smell, DIRS.WEST, 1);
        }
        break;
      }
      case DIRS.WEST: {
        if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
          doSmellDirected(game, lang, nextCell, engram.west.smell, DIRS.EAST, 1);
        }
        break;
      }
    } // end switch(dir)
  } // end for (pos<4)
}

/**
 *
 * @param game
 * @param lang
 * @param cell
 * @param engramDir the original direction from which the function is walking through, centered on the player
 * @param lastDirection used to make sure the function isn't checking going to the direction it just checked
 * @param distance how many cells from the first call of the function it is checking / depth of recursion
 */
export function doSmellDirected(game: Game, lang: string, cell: CellBase, engramDir: ISmell[], lastDirection: DIRS, distance: number) {
  const data = GameLang.getInstance(lang);
  const method = `doSmellDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
  fns.logDebug(__filename, method, 'Entering');
  const MAX_DISTANCE = 6;
  if (!!(cell.Tags & CELL_TAGS.START) && distance < data.entities.lava.smell.intensity) {
    const intensity = data.entities.lava.smell.intensity;
    setSmell(engramDir, { scent: data.entities.lava.smell.adjective, strength: Math.floor(intensity / distance) });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH) && distance < data.entities.exit.smell.intensity) {
    const intensity = data.entities.exit.smell.intensity;
    setSmell(engramDir, { scent: data.entities.exit.smell.adjective, strength: Math.floor(intensity / distance) });
  }

  if (cell.Traps !== CELL_TRAPS.NONE) {
    for (let pos = 0; pos < 9; pos++) {
      const trapEnum = 1 << pos;
      const trapType = CELL_TRAPS[trapEnum];
      if (!!(cell.Traps & trapEnum)) {
        try {
          const intensity = data.traps[trapType.toUpperCase()].smell.intensity;
          const adjective = data.traps[trapType.toUpperCase()].smell.adjective;
          if (distance < intensity) {
            if (
              !engramDir.find(smell => {
                if (smell.scent === adjective) {
                  if (smell.strength > distance) {
                    smell.strength = Math.floor(intensity / distance);
                  }
                  return true;
                } else {
                  return false;
                }
              })
            ) {
              setSmell(engramDir, { scent: adjective, strength: Math.floor(intensity / distance) });
            }
          }
        } catch (err) {
          fns.logDebug(__filename, method, err);
        }
      } // end (!!(cell.Traps & trapEnum))
    } // end for(pos<9)}
  } // if (!!(cell.Traps & CELL_TRAPS.NONE))
  //  loop through the cardinal directions in
  if (distance < MAX_DISTANCE) {
    for (let pos = 0; pos < 4; pos++) {
      const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
      switch (dir) {
        case DIRS.NORTH: {
          if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0 && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
            doSmellDirected(game, lang, nextCell, engramDir, DIRS.SOUTH, distance + 1);
          }
          break;
        }
        case DIRS.SOUTH: {
          if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
            doSmellDirected(game, lang, nextCell, engramDir, DIRS.NORTH, distance + 1);
          }
          break;
        }
        case DIRS.EAST: {
          if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
            doSmellDirected(game, lang, nextCell, engramDir, DIRS.WEST, distance + 1);
          }
          break;
        }
        case DIRS.WEST: {
          if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0 && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
            doSmellDirected(game, lang, nextCell, engramDir, DIRS.EAST, distance + 1);
          }
          break;
        }
      } // end switch(dir)
    } // end for (pos<4)
  }
} // end doSmellDirected

/**
 * Update the given smell array with given scent if smell[0].scent is empty (as is the
 * case if new Engram()), otherwise push scent onto the see array.
 *
 * @param smell
 * @param scent
 */
function setSmell(smell: Array<ISmell>, scent: ISmell) {
  if (smell[0].scent === '') {
    smell[0] = scent;
  } else {
    smell.push(scent);
  }
}
