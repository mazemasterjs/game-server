import * as fns from '../funcs';
import { format } from 'util';
import { Game } from '@mazemasterjs/shared-library/Game';
import { GameLang } from '../GameLang';
import { grantTrophy, logDebug } from '../funcs';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import { PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { doLook } from './actLook';
import { Engram } from '@mazemasterjs/shared-library/Engram';

export async function doStand(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doStand(${game.Id})`, 'Player has issued the STAND command.');
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const maze: Maze = new Maze(game.Maze);
  const startScore = game.Score.getTotalScore();
  const engram = game.Actions[game.Actions.length - 1].engram;

  // note the lava to the north if in the start cell
  // if (cell.Location.equals(game.Maze.StartCell)) {
  //   engram.sight = 'LAVA NORTH';
  // }

  if (!!(game.Player.State & PLAYER_STATES.STANDING)) {
    // TODO: Add trophy STANDING_AROUND once it's pushed live
    game = await grantTrophy(game, TROPHY_IDS.STANDING_AROUND);
    game.Actions[game.Actions.length - 1].outcomes.push('STANDING');
  } else {
    // execute the stand command
    game.Player.addState(PLAYER_STATES.STANDING);

    // TODO: Add trophy TAKING_A_STAND once it's pushed live
    game = await grantTrophy(game, TROPHY_IDS.TAKING_A_STAND);
    game.Actions[game.Actions.length - 1].outcomes.push('STAND HARDER');
  }

  // look ahead and one space around
  engram.sight = doLook(game, langCode).engram.sight;
  // gather senses
  engram.smell = fns.getSmell(game, maze, langCode, new Engram(), cell, 0);

  // finalize the game action
  game.Actions[game.Actions.length - 1] = fns.finalizeAction(game, maze, startScore);

  return Promise.resolve(game.Actions[game.Actions.length - 1]);
}
