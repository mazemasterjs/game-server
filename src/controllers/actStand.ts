import * as fns from '../funcs';
import { Game } from '@mazemasterjs/shared-library/Game';
import { grantTrophy, logDebug } from '../funcs';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import GameLang from '../GameLang';

export async function doStand(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doStand(${game.Id}, ${langCode})`, 'Player has issued the STAND command.');
  const startScore = game.Score.getTotalScore();
  const data = GameLang.getInstance(langCode);
  if (!!(game.Player.State & PLAYER_STATES.STUNNED)) {
    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.stunned);
    game.Player.removeState(PLAYER_STATES.STUNNED);
  } else if (!!(game.Player.State & PLAYER_STATES.STANDING)) {
    game = await grantTrophy(game, TROPHY_IDS.STAND_HARDER);
    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.standWhileStanding);
  } else {
    // execute the stand command
    game.Player.addState(PLAYER_STATES.STANDING);

    // TODO: Add trophy TAKING_A_STAND once it's pushed live
    game = await grantTrophy(game, TROPHY_IDS.TAKING_A_STAND);
    game.Actions[game.Actions.length - 1].outcomes.push(data.outcomes.stand);
  }

  // finalize and return action
  if (!!(game.Player.State & PLAYER_STATES.SLOWED)) {
    return Promise.resolve(fns.finalizeAction(game, 2, startScore, langCode));
  }
  return Promise.resolve(fns.finalizeAction(game, 1, startScore, langCode));
}
