import { Game } from '@mazemasterjs/shared-library/Game';
import { calculateIntensity, logTrace } from '../funcs';
import { CELL_TAGS, CELL_TRAPS, DIRS } from '@mazemasterjs/shared-library/Enums';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import CellBase from '@mazemasterjs/shared-library/CellBase';
import { ITaste } from '@mazemasterjs/shared-library/Interfaces/ISenses';
import GameLang from '../GameLang';

const MAX_TASTE_DISTANCE = 0;

export function doTasteLocal(game: Game, lang: string) {
  const method = `doTasteLocal(${game.Id}, ${lang})`;
  logTrace(__filename, method, 'Entering');
  const cell = game.Maze.getCell(game.Player.Location);
  const engram = game.Actions[game.Actions.length - 1].engram;

  // const data = GameLang.getInstance(lang);
  // get the local tastes
  // if (!!(cell.Tags & CELL_TAGS.START)) {
  //   setTaste(engram.north.taste, { taste: data.entities.lava.taste.adjective, strength: data.entities.lava.taste.intensity });
  // }
  // if (!!(cell.Tags & CELL_TAGS.FINISH)) {
  //   setTaste(engram.south.taste, { taste: data.entities.cheese.taste.adjective, strength: data.entities.cheese.taste.intensity });
  // }

  //  loop through the cardinal directions in DIRS
  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
    switch (dir) {
      case DIRS.NORTH: {
        if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
          doTasteDirected(game, lang, nextCell, engram.north.taste, DIRS.SOUTH, 1);
        }
        break;
      }
      case DIRS.SOUTH: {
        if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
          doTasteDirected(game, lang, nextCell, engram.south.taste, DIRS.NORTH, 1);
        }
        break;
      }
      case DIRS.EAST: {
        if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
          doTasteDirected(game, lang, nextCell, engram.east.taste, DIRS.WEST, 1);
        }
        break;
      }
      case DIRS.WEST: {
        if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
          doTasteDirected(game, lang, nextCell, engram.west.taste, DIRS.EAST, 1);
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
export function doTasteDirected(game: Game, lang: string, cell: CellBase, engramDir: ITaste[], lastDirection: DIRS, distance: number) {
  const data = GameLang.getInstance(lang);
  const method = `dotasteDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
  logTrace(__filename, method, 'Entering');
  if (!!(cell.Tags & CELL_TAGS.START) && distance <= data.entities.lava.taste.intensity) {
    setTaste(engramDir, {
      taste: data.entities.lava.taste.adjective,
      strength: calculateIntensity(data.entities.lava.taste.intensity, distance + 1, MAX_TASTE_DISTANCE) * 10,
    });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH) && distance <= data.entities.exit.taste.intensity) {
    setTaste(engramDir, {
      taste: data.entities.exit.taste.adjective,
      strength: calculateIntensity(data.entities.exit.taste.intensity, distance + 1, MAX_TASTE_DISTANCE) * 10,
    });
  }

  if (cell.Traps !== CELL_TRAPS.NONE) {
    for (let pos = 0; pos < 9; pos++) {
      const trapEnum = 1 << pos;
      const trapType = CELL_TRAPS[trapEnum];
      if (!!(cell.Traps & trapEnum)) {
        try {
          const intensity = data.traps[trapType.toUpperCase()].taste.intensity;
          const adjective = data.traps[trapType.toUpperCase()].taste.adjective;
          if (distance <= intensity) {
            setTaste(engramDir, { taste: adjective, strength: calculateIntensity(intensity, distance, MAX_TASTE_DISTANCE) * 10 });
          }
        } catch (err) {
          logTrace(__filename, method, err);
        }
      } // end (!!(cell.Traps & trapEnum))
    } // end for(pos<9)}
  } // if (!!(cell.Traps & CELL_TRAPS.NONE))
  //  loop through the cardinal directions in DIRS
  if (distance < MAX_TASTE_DISTANCE) {
    for (let pos = 0; pos < 4; pos++) {
      const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
      switch (dir) {
        case DIRS.NORTH: {
          if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0 && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
            doTasteDirected(game, lang, nextCell, engramDir, DIRS.SOUTH, distance + 1);
          }
          break;
        }
        case DIRS.SOUTH: {
          if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
            doTasteDirected(game, lang, nextCell, engramDir, DIRS.NORTH, distance + 1);
          }
          break;
        }
        case DIRS.EAST: {
          if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
            doTasteDirected(game, lang, nextCell, engramDir, DIRS.WEST, distance + 1);
          }
          break;
        }
        case DIRS.WEST: {
          if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0 && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
            doTasteDirected(game, lang, nextCell, engramDir, DIRS.EAST, distance + 1);
          }
          break;
        }
      } // end switch(dir)
    } // end for (pos<4)
  }
} // end dotasteDirected

/**
 * Update the given taste array with given scent if taste[0].scent is empty (as is the
 * case if new Engram()), otherwise push scent onto the see array.
 *
 * @param taste
 * @param scent
 */
function setTaste(tastes: Array<ITaste>, taste: ITaste) {
  if (tastes[0].taste === 'nothing') {
    tastes[0] = taste;
  } else {
    tastes.push(taste);
  }
}
