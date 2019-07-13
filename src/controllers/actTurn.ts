import * as fns from '../funcs';
import { DIRS, PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { Game } from '@mazemasterjs/shared-library/Game';
import { getNextDir } from '@mazemasterjs/shared-library/Helpers';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { logDebug } from '../funcs';
import GameLang from '../GameLang';

export async function doTurn(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doTurn(${game.Id}, ${langCode})`, 'Player has issued the Turn command.');
  const startScore = game.Score.getTotalScore();
  const action = game.Actions[game.Actions.length - 1];
  const direction = action.direction;
  const data = GameLang.getInstance(langCode);
  if (!(game.Player.State & PLAYER_STATES.STUNNED)) {
    {
      // Turns left or right
      switch (direction) {
        case DIRS.RIGHT: {
          action.outcomes.push(data.outcomes.turnRight);
          game.Player.Facing = getNextDir(game.Player.Facing);
          break;
        } // end case DIRS.RIGHT
        case DIRS.LEFT: {
          action.outcomes.push(data.outcomes.turnLeft);
          game.Player.Facing = getNextDir(game.Player.Facing, true);
          break;
        } // end case DIRS.LEFT
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
