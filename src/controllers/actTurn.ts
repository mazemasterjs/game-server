import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import * as fns from '../funcs';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GameLang } from '../GameLang';
import { grantTrophy, logDebug } from '../funcs';
import { format } from 'util';
import { DIRS, PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import { doLook } from './actLook';
import path from 'path';
import fs from 'fs';

export async function doTurn(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doTurn(${game.Id})`, 'Player has issued the Turn command.');
  const startScore = game.Score.getTotalScore();
  const method = `doTurn(${game.Id})`;
  const action = game.Actions[game.Actions.length - 1];
  const direction = action.direction;
  let engram: Engram = game.Actions[game.Actions.length - 1].engram;
  // Turns left or right
  switch (direction) {
    case DIRS.LEFT: {
      switch (game.Player.Facing) {
        case DIRS.NORTH:
          game.Player.Facing = action.direction = DIRS.WEST;
          action.outcomes.push('You turn to the left.');
          break;
        case DIRS.WEST:
          game.Player.Facing = action.direction = DIRS.SOUTH;
          action.outcomes.push('You turn to the left.');
          break;
        case DIRS.SOUTH:
          game.Player.Facing = action.direction = DIRS.EAST;
          action.outcomes.push('You turn to the left.');
          break;
        case DIRS.EAST:
          game.Player.Facing = action.direction = DIRS.NORTH;
          action.outcomes.push('You turn to the left.');
          break;
      }
      break;
    } // end case DIRS.LEFT
    case DIRS.RIGHT: {
      switch (game.Player.Facing) {
        case DIRS.NORTH:
          game.Player.Facing = action.direction = DIRS.EAST;
          action.outcomes.push('You turn to the Right.');
          break;
        case DIRS.WEST:
          game.Player.Facing = action.direction = DIRS.NORTH;
          action.outcomes.push('You turn to the Right.');
          break;
        case DIRS.SOUTH:
          game.Player.Facing = action.direction = DIRS.WEST;
          action.outcomes.push('You turn to the Right.');
          break;
        case DIRS.EAST:
          game.Player.Facing = action.direction = DIRS.SOUTH;
          action.outcomes.push('You turn to the Rightt.');
          break;
      }
      break;
    } // end case DIRS.RIGHT
    default: {
      action.outcomes.push('You turn 360 degrees and moonwalk in place');
    }
  }

  engram = doLook(game, langCode, engram);
  // finalize the game action
  game.Actions[game.Actions.length - 1] = fns.finalizeAction(game, startScore);

  return Promise.resolve(game.Actions[game.Actions.length - 1]);
}
