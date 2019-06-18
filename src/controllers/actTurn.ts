import * as fns from '../funcs';
import { format } from 'util';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GameLang } from '../GameLang';
import { grantTrophy, logDebug } from '../funcs';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import { DIRS, PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import {lookForward} from './actLook';
import path from 'path';
import fs from 'fs';

export async function doTurn(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doTurn(${game.Id})`, 'Player has issued the Turn command.');
  const maze: Maze = new Maze(game.Maze);
  const startScore = game.Score.getTotalScore();
  const method = `doTurn(${game.Id})`;
  const action = game.Actions[game.Actions.length - 1];
  const direction  = action.direction;
  const engram: Engram = game.Actions[game.Actions.length - 1].engram;
  // Grab the appropriate engram file
  const file = path.resolve(`./data/engram.json`);
  const data = JSON.parse(fs.readFileSync(file, 'UTF-8'));

  switch (direction) {
    case DIRS.NORTH: {
      game.Player.Facing = DIRS.NORTH;
      action.outcomes.push('You turn to the North.');
      break;
    }
    case DIRS.SOUTH: {
      game.Player.Facing = DIRS.SOUTH
      action.outcomes.push('You turn to the South.');
      break;
    }
    case DIRS.EAST: {
      game.Player.Facing = DIRS.EAST
      action.outcomes.push('You turn to the East.');
      break;
    }
    case DIRS.WEST: {
      game.Player.Facing = DIRS.WEST;
      action.outcomes.push('You turn to the West.');
      break;
    }
  }
  const newEngram = lookForward(game,langCode,game.Maze.Cells[game.Player.Location.row][game.Player.Location.col],engram, 0, data);

  action.engram.sight = newEngram.sight;
  // finalize the game action
  game.Actions[game.Actions.length - 1] = fns.finalizeAction(game, maze, startScore);

  return Promise.resolve(game.Actions[game.Actions.length - 1]);
}
