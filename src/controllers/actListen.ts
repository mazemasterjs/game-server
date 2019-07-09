import { Game } from '@mazemasterjs/shared-library/Game';
import { logDebug, calculateIntensity } from '../funcs';
import { CELL_TAGS, CELL_TRAPS, DIRS } from '@mazemasterjs/shared-library/Enums';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import CellBase from '@mazemasterjs/shared-library/CellBase';
import { ISound } from '@mazemasterjs/shared-library/Interfaces/ISenses';
import GameLang from '../GameLang';

export function doListenLocal(game: Game, lang: string) {
  const method = `doListenLocal(${game.Id}, ${lang})`;
  logDebug(__filename, method, 'Entering');
  const cell = game.Maze.getCell(game.Player.Location);
  const engram = game.Actions[game.Actions.length - 1].engram;
  const data = GameLang.getInstance(lang);
  // get the local sounds
  if (!!(cell.Tags & CELL_TAGS.START)) {
    setSound(engram.north.hear, { sound: data.entities.lava.sound.adjective, volume: calculateIntensity(data.entities.lava.sound.intensity, 1, 10) });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH)) {
    setSound(engram.south.hear, { sound: data.entities.exit.sound.adjective, volume: calculateIntensity(data.entities.cheese.sound.intensity, 1, 10) });
  }

  //  loop through the cardinal directions in DIRS
  for (let pos = 0; pos < 4; pos++) {
    const dir = 1 << pos; // bitwish shift (1, 2, 4, 8)
    switch (dir) {
      case DIRS.NORTH: {
        if (cell.isDirOpen(DIRS.NORTH) && cell.Location.row - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row - 1, cell.Location.col));
          doListenDirected(game, lang, nextCell, engram.north.hear, DIRS.SOUTH, 1);
        }
        break;
      }
      case DIRS.SOUTH: {
        if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
          doListenDirected(game, lang, nextCell, engram.south.hear, DIRS.NORTH, 1);
        }
        break;
      }
      case DIRS.EAST: {
        if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
          doListenDirected(game, lang, nextCell, engram.east.hear, DIRS.WEST, 1);
        }
        break;
      }
      case DIRS.WEST: {
        if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0) {
          const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
          doListenDirected(game, lang, nextCell, engram.west.hear, DIRS.EAST, 1);
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
export function doListenDirected(game: Game, lang: string, cell: CellBase, engramDir: ISound[], lastDirection: DIRS, distance: number) {
  const data = GameLang.getInstance(lang);
  const method = `doListenDirected(${game.Id}, ${lang}, ${cell.Location}, [emgramDir], ${lastDirection}, ${distance})`;
  const MAX_DISTANCE = 10;
  logDebug(__filename, method, 'Entering');
  if (!!(cell.Tags & CELL_TAGS.START) && distance <= data.entities.lava.sound.intensity) {
    setSound(engramDir, {
      sound: data.entities.lava.sound.adjective,
      volume: calculateIntensity(data.entities.lava.sound.intensity, distance + 1, MAX_DISTANCE),
    });
  }
  if (!!(cell.Tags & CELL_TAGS.FINISH) && distance <= data.entities.exit.sound.intensity) {
    setSound(engramDir, {
      sound: data.entities.exit.sound.adjective,
      volume: calculateIntensity(data.entities.exit.sound.intensity, distance + 1, MAX_DISTANCE),
    });
  }

  if (cell.Traps !== CELL_TRAPS.NONE) {
    for (let pos = 0; pos < 9; pos++) {
      const trapEnum = 1 << pos;
      const trapType = CELL_TRAPS[trapEnum];
      if (!!(cell.Traps & trapEnum)) {
        try {
          const intensity = data.traps[trapType.toUpperCase()].sound.intensity;
          const adjective = data.traps[trapType.toUpperCase()].sound.adjective;
          // const intensityString = `data.entities.${trapType}.smell.intensity`;
          // const adjectiveString = `data.entities.${trapType}.smell.adjective`;
          // const intensity = eval(intensityString);  <-- very clever, but an unsafe operation that the linter opposes
          // const adjective = eval(adjectiveString);  <-- very clever, but an unsafe operation that the linter opposes
          if (distance <= intensity) {
            setSound(engramDir, { sound: adjective, volume: calculateIntensity(intensity, distance, MAX_DISTANCE) });
          }
        } catch (err) {
          logDebug(__filename, method, err);
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
            doListenDirected(game, lang, nextCell, engramDir, DIRS.SOUTH, distance + 1);
          }
          break;
        }
        case DIRS.SOUTH: {
          if (cell.isDirOpen(DIRS.SOUTH) && cell.Location.row + 1 < game.Maze.Height && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row + 1, cell.Location.col));
            doListenDirected(game, lang, nextCell, engramDir, DIRS.NORTH, distance + 1);
          }
          break;
        }
        case DIRS.EAST: {
          if (cell.isDirOpen(DIRS.EAST) && cell.Location.col + 1 < game.Maze.Width && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col + 1));
            doListenDirected(game, lang, nextCell, engramDir, DIRS.WEST, distance + 1);
          }
          break;
        }
        case DIRS.WEST: {
          if (cell.isDirOpen(DIRS.WEST) && cell.Location.col - 1 >= 0 && lastDirection !== dir) {
            const nextCell = game.Maze.getCell(new MazeLoc(cell.Location.row, cell.Location.col - 1));
            doListenDirected(game, lang, nextCell, engramDir, DIRS.EAST, distance + 1);
          }
          break;
        }
      } // end switch(dir)
    } // end for (pos<4)
  }
} // end doListenDirected

function setSound(sounds: Array<ISound>, sound: ISound) {
  if (sounds[0].sound === 'nothing') {
    sounds[0] = sound;
  } else {
    sounds.push(sound);
  }
}
