import CellBase from '@mazemasterjs/shared-library/CellBase';
import GameLang from '../GameLang';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import { CELL_TAGS, CELL_TRAPS, DIRS } from '@mazemasterjs/shared-library/Enums';
import { Game } from '@mazemasterjs/shared-library/Game';
import { IFeeling } from '@mazemasterjs/shared-library/Interfaces/ISenses';
import { logDebug, calculateIntensity } from '../funcs';
import { fsync } from 'fs';

export function doFeelLocal(game: Game, lang: string) {
  const method = `dofeelLocal(${game.Id}, ${lang})`;
  logDebug(__filename, method, 'Entering');
  const cell = game.Maze.getCell(game.Player.Location);
  const engram = game.Actions[game.Actions.length - 1].engram;
  const data = GameLang.getInstance(lang);
  // get the local sounds
  if (!!(cell.Tags & CELL_TAGS.START)) {
    setFeel(engram.north.feel, { feeling: data.entities.lava.touch.adjective, intensity: calculateIntensity(data.entities.lava.touch.intensity, 1, 3) * 10 });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH)) {
    setFeel(engram.south.feel, { feeling: data.entities.exit.touch.adjective, intensity: calculateIntensity(data.entities.exit.touch.intensity, 1, 3) * 10 });
  }

  //  loop through the cardinal directions in DIRS
  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
    switch (dir) {
      case DIRS.NORTH: {
        if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
          doFeelDirected(game, lang, nextCell, engram.north.feel, DIRS.SOUTH, 1);
        }
        break;
      }
      case DIRS.SOUTH: {
        if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
          doFeelDirected(game, lang, nextCell, engram.south.feel, DIRS.NORTH, 1);
        }
        break;
      }
      case DIRS.EAST: {
        if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
          doFeelDirected(game, lang, nextCell, engram.east.feel, DIRS.WEST, 1);
        }
        break;
      }
      case DIRS.WEST: {
        if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
          doFeelDirected(game, lang, nextCell, engram.west.feel, DIRS.EAST, 1);
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
export function doFeelDirected(game: Game, lang: string, cell: CellBase, engramDir: IFeeling[], lastDirection: DIRS, distance: number) {
  const data = GameLang.getInstance(lang);
  const method = `dofeelDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
  logDebug(__filename, method, 'Entering');
  const MAX_DISTANCE = 3;
  if (!!(cell.Tags & CELL_TAGS.START) && data.entities.lava.touch.intensity >= distance) {
    setFeel(engramDir, {
      feeling: data.entities.lava.touch.adjective,
      intensity: calculateIntensity(data.entities.lava.touch.intensity, distance + 1, MAX_DISTANCE) * 10,
    });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH) && data.entities.exit.touch.intensity >= distance) {
    setFeel(engramDir, {
      feeling: data.entities.exit.touch.adjective,
      intensity: calculateIntensity(data.entities.exit.touch.intensity, distance + 1, MAX_DISTANCE) * 10,
    });
  }

  if (cell.Traps !== CELL_TRAPS.NONE) {
    for (let pos = 0; pos < 9; pos++) {
      const trapEnum = 1 << pos;
      const trapType = CELL_TRAPS[trapEnum];
      if (!!(cell.Traps & trapEnum)) {
        try {
          const int = data.traps[trapType.toUpperCase()].touch.intensity;
          const adjective = data.traps[trapType.toUpperCase()].touch.adjective;
          if (distance <= int) {
            setFeel(engramDir, { feeling: adjective, intensity: calculateIntensity(int, distance, MAX_DISTANCE) * 10 });
          }
        } catch (err) {
          logDebug(__filename, method, `For ${trapType}: ` + err);
        }
      } // end (!!(cell.Traps & trapEnum))
    } // end for(pos<9)}
  } // if (!!(cell.Traps & CELL_TRAPS.NONE))
  //  loop through the cardinal directions in DIRS
  if (distance < MAX_DISTANCE) {
    for (let pos = 0; pos < 4; pos++) {
      const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
      switch (dir) {
        case DIRS.NORTH: {
          if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0 && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
            doFeelDirected(game, lang, nextCell, engramDir, DIRS.SOUTH, distance + 1);
          }
          break;
        }
        case DIRS.SOUTH: {
          if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
            doFeelDirected(game, lang, nextCell, engramDir, DIRS.NORTH, distance + 1);
          }
          break;
        }
        case DIRS.EAST: {
          if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
            doFeelDirected(game, lang, nextCell, engramDir, DIRS.WEST, distance + 1);
          }
          break;
        }
        case DIRS.WEST: {
          if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0 && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
            doFeelDirected(game, lang, nextCell, engramDir, DIRS.EAST, distance + 1);
          }
          break;
        }
      } // end switch(dir)
    } // end for (pos<4)
  }
} // end dofeelDirected

function setFeel(feelings: Array<IFeeling>, feel: IFeeling) {
  if (feelings[0].feeling === 'nothing') {
    feelings[0] = feel;
  } else {
    feelings.push(feel);
  }
}
