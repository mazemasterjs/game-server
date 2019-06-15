import { Game } from '@mazemasterjs/shared-library/Game';
import { grantTrophy, logDebug } from '../funcs';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Maze } from '@mazemasterjs/shared-library/Maze';
import { PLAYER_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import * as lang from '../lang/langIndex';
import {format} from 'util';

export function doStand(game: Game, language: lang.Ilanguage): IAction {
  
  logDebug(__filename, `doStand(${game.Id})`, 'Player has issued the STAND command.');
  const cell = game.Maze.Cells[game.Player.Location.row][game.Player.Location.col];
  const action = game.Actions[game.Actions.length - 1];
  const maze: Maze = new Maze(game.Maze);
  const preStandScore = game.Score.getTotalScore();
  const messages =  language.myInstance().messages;

  // increment move counters
  game.Score.addMove();
  action.moveCount++;

  // note the lava to the north if in the start cell
  if (cell.Location.equals(game.Maze.StartCell)) {
    action.engram.sight = messages.actions.engramDescriptions.sight.local.entrance;
  }

  if (!!(game.Player.State & PLAYER_STATES.STANDING)) {
    // TODO: Add trophy STANDING_AROUND once it's pushed live
    grantTrophy(game, TROPHY_IDS.STANDING_AROUND);
    action.outcomes.push(messages.actions.outcome.stand.standing);
  } else {
    // execute the stand command
    game.Player.addState(PLAYER_STATES.STANDING);

    // TODO: Add trophy TAKING_A_STAND once it's pushed live
    grantTrophy(game, TROPHY_IDS.TAKING_A_STAND);
    action.outcomes.push(messages.actions.outcome.stand.sitting);
  }

  // list exits
  action.engram.sight = format(messages.actions.engramDescriptions.sight.local.exit,cell.listExits());// messages.actions.engramDescriptions.sight.local.exit + cell.listExits();

  // track the score change from this one move
  action.score = game.Score.getTotalScore() - preStandScore;

  // TODO: text render - here now just for DEV/DEBUG purposes
  action.outcomes.push(maze.generateTextRender(true, game.Player.Location));

  return action;
}
