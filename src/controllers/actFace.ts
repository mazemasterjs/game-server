import * as fns from '../funcs';
import { DIRS, PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { Game } from '@mazemasterjs/shared-library/Game';
import { getNextDir } from '@mazemasterjs/shared-library/Helpers';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { logDebug } from '../funcs';
import GameLang from '../GameLang';
import { format } from 'util';

export async function doFace(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doFace(${game.Id}, ${langCode})`, 'Player has issued the Face command.');
  const startScore = game.Score.getTotalScore();
  const action = game.Actions[game.Actions.length - 1];
  const direction = action.direction;
  const data = GameLang.getInstance(langCode);
  if (!(game.Player.State & PLAYER_STATES.STUNNED)) {
    {
      switch (direction) {
        case DIRS.NORTH: {
          action.outcomes.push(format(data.outcomes.face, data.directions[DIRS[action.direction]]));
          game.Player.Facing = DIRS.NORTH;
          break;
        }
        case DIRS.SOUTH: {
          action.outcomes.push(format(data.outcomes.face, data.directions[DIRS[action.direction]]));
          game.Player.Facing = DIRS.SOUTH;
          break;
        }
        case DIRS.WEST: {
          action.outcomes.push(format(data.outcomes.face, data.directions[DIRS[action.direction]]));
          game.Player.Facing = DIRS.WEST;
          break;
        }
        case DIRS.EAST: {
          action.outcomes.push(format(data.outcomes.face, data.directions[DIRS[action.direction]]));
          game.Player.Facing = DIRS.EAST;
          break;
        }
        default: {
          action.outcomes.push(data.outcomes.turnWrong);
          game = await fns.grantTrophy(game, TROPHY_IDS.WASTED_TIME);
        }
      }
    }
  } else {
    action.outcomes.push(data.outcomes.stunned);
    game.Player.removeState(PLAYER_STATES.STUNNED);
    game = await fns.grantTrophy(game, TROPHY_IDS.DAZED_AND_CONFUSED);
  }

  // finalize and return the turn action results
  return Promise.resolve(fns.finalizeAction(game, 1, startScore, langCode));
}
