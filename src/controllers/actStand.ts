import * as fns from '../funcs';
import { format } from 'util';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GameLang } from '../GameLang';
import { grantTrophy, logDebug } from '../funcs';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import { PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';

export async function doStand(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doStand(${game.Id})`, 'Player has issued the STAND command.');
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const maze: Maze = new Maze(game.Maze);
  const startScore = game.Score.getTotalScore();
  const lang = GameLang.getInstance(langCode);

  // note the lava to the north if in the start cell
  if (cell.Location.equals(game.Maze.StartCell)) {
    game.Actions[game.Actions.length - 1].engram.sight = lang.actions.engramDescriptions.sight.local.entrance;
  }

  if (!!(game.Player.State & PLAYER_STATES.STANDING)) {
    // TODO: Add trophy STANDING_AROUND once it's pushed live
    game = await grantTrophy(game, TROPHY_IDS.STANDING_AROUND);
    game.Actions[game.Actions.length - 1].outcomes.push(lang.actions.outcome.stand.standing);
  } else {
    // execute the stand command
    game.Player.addState(PLAYER_STATES.STANDING);

    // TODO: Add trophy TAKING_A_STAND once it's pushed live
    game = await grantTrophy(game, TROPHY_IDS.TAKING_A_STAND);
    game.Actions[game.Actions.length - 1].outcomes.push(lang.actions.outcome.stand.sitting);
  }

  // list exits
  game.Actions[game.Actions.length - 1].engram.sight = format(lang.actions.engramDescriptions.sight.local.exit, cell.listExits());

  // finalize the game action
  game.Actions[game.Actions.length - 1] = fns.finalizeAction(game, maze, startScore);

  return Promise.resolve(game.Actions[game.Actions.length - 1]);
}
