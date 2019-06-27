import * as fns from '../funcs';
import { Game } from '@mazemasterjs/shared-library/Game';
import { grantTrophy, logDebug } from '../funcs';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';

export async function doStand(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doStand(${game.Id}, ${langCode})`, 'Player has issued the STAND command.');
  const startScore = game.Score.getTotalScore();

  if (!!(game.Player.State & PLAYER_STATES.STANDING)) {
    game = await grantTrophy(game, TROPHY_IDS.STAND_HARDER);
    game.Actions[game.Actions.length - 1].outcomes.push('You were already standing.');
  } else {
    // execute the stand command
    game.Player.addState(PLAYER_STATES.STANDING);

    // TODO: Add trophy TAKING_A_STAND once it's pushed live
    game = await grantTrophy(game, TROPHY_IDS.TAKING_A_STAND);
    game.Actions[game.Actions.length - 1].outcomes.push('You stand up.');
  }

  // finalize and return action
  return Promise.resolve(fns.finalizeAction(game, startScore, langCode));
}
