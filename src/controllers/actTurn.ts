import * as fns from '../funcs';
import { DIRS } from '@mazemasterjs/shared-library/Enums';
import { Game } from '@mazemasterjs/shared-library/Game';
import { getNextDir } from '@mazemasterjs/shared-library/Helpers';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { logDebug } from '../funcs';

export function doTurn(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doTurn(${game.Id}, ${langCode})`, 'Player has issued the Turn command.');
  const startScore = game.Score.getTotalScore();
  const action = game.Actions[game.Actions.length - 1];
  const direction = action.direction;

  // Turns left or right
  switch (direction) {
    case DIRS.RIGHT: {
      action.outcomes.push('You turn to the right.');
      game.Player.Facing = getNextDir(game.Player.Facing);
      break;
    } // end case DIRS.RIGHT
    case DIRS.LEFT: {
      action.outcomes.push('You turn to the left.');
      game.Player.Facing = getNextDir(game.Player.Facing, true);
      break;
    } // end case DIRS.LEFT
    default: {
      action.outcomes.push('You turn 360 degrees and moonwalk in place');
    }
  }

  // finalize and return the turn action results
  return Promise.resolve(fns.finalizeAction(game, startScore, langCode));
}
