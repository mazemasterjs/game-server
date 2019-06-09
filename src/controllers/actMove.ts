import * as fns from '../funcs';
import { Engram } from '@mazemasterjs/shared-library/Engram';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { Game } from '@mazemasterjs/shared-library/Game';
import { logDebug, logWarn } from '../funcs';
import Maze from '@mazemasterjs/shared-library/Maze';
import { DIRS, GAME_MODES, GAME_RESULTS, GAME_STATES, TROPHY_IDS } from '@mazemasterjs/shared-library/Enums';
import { Player } from '@mazemasterjs/shared-library/Player';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Action } from '@mazemasterjs/shared-library/Action';
import MazeLoc from '@mazemasterjs/shared-library/MazeLoc';
import { Cache, CACHE_TYPES } from '../Cache';
import Trophy from '@mazemasterjs/shared-library/Trophy';

export async function doMove(game: Game): Promise<IAction> {
  const method = `doMove(${game.Id})`;
  const engram: Engram = new Engram();
  const action: IAction = game.Actions[game.Actions.length - 1];
  const dir: DIRS = action.direction;
  const maze: Maze = new Maze(game.Maze);

  // seems that that embedded objects reliable... have to keep reinstantiating things??
  const pLoc: MazeLoc = new MazeLoc(game.Player.Location.row, game.Player.Location.col);

  //  logDebug(__filename, 'doMove', `${action.direction} is open? `);
  logDebug(__filename, 'doMove', `Player Loc: ${pLoc.toString()}`);

  // set the base engram
  engram.sight = 'You see nothing';
  engram.smell = 'You smell nothing.';
  engram.touch = 'You feel nothing.';
  engram.taste = 'You Taste nothing.';
  engram.sound = 'You hear nothing.';

  if (maze.getCell(pLoc).isDirOpen(dir)) {
    // add a move
    game.Score.addMove();
    engram.sight = 'You see exits: ' + maze.getCell(pLoc).listExits();

    switch (dir) {
      case DIRS.NORTH: {
        if (pLoc.equals(game.Maze.StartCell)) {
          engram.sight = 'Lava!';
          engram.smell = 'Lava!';
          engram.touch = 'Lava!';
          engram.taste = 'Lava!';
          engram.sound = 'Lava!';
          action.outcomes.push("You step into the lava and, well... Let's just say: Game over.");
          game.State = GAME_STATES.FINISHED;
          game.Score.GameResult = GAME_RESULTS.DEATH_LAVA;
          await Cache.use()
            .fetchOrGetItem(CACHE_TYPES.TROPHY, TROPHY_IDS[TROPHY_IDS.WISHFUL_DYING])
            .then(item => {
              const trophy: Trophy = item;
              game.Score.addTrophy(TROPHY_IDS.WISHFUL_DYING);
              game.Score.addBonusPoints(trophy.BonusAward);
              fns.logDebug(__filename, method, 'Trophy added.');
            })
            .catch(fetchError => {
              fns.logWarn(__filename, method, 'Unable to fetch trophy: ' + TROPHY_IDS[TROPHY_IDS.WISHFUL_DYING] + '. Error -> ' + fetchError.message);
            });
          fns.summarizeGame(action, game.Score);
          logDebug(__filename, method, 'The game has been LOST: \r\n' + action.outcomes.join('\r\n'));
        } else {
          action.outcomes.push('You move cautiously to the North.');
          pLoc.row--;
        }
        break;
      }
      case DIRS.SOUTH: {
        if (pLoc.equals(game.Maze.FinishCell)) {
          engram.sight = 'Cheese!';
          engram.smell = 'Cheese!';
          engram.touch = 'Cheese!';
          engram.taste = 'Cheese!';
          engram.sound = 'Cheese!';
          action.outcomes.push('You step into the light and... CHEESE!');
          game.State = GAME_STATES.FINISHED;
          game.Score.GameResult = GAME_RESULTS.WIN;
          await Cache.use()
            .fetchOrGetItem(CACHE_TYPES.TROPHY, TROPHY_IDS[TROPHY_IDS.CHICKEN_DINNER])
            .then(item => {
              const trophy: Trophy = item;
              game.Score.addTrophy(TROPHY_IDS.CHICKEN_DINNER);
              game.Score.addBonusPoints(trophy.BonusAward);
              fns.logDebug(__filename, method, 'Trophy added.');
            })
            .catch(fetchError => {
              fns.logWarn(__filename, method, 'Unable to fetch trophy: ' + TROPHY_IDS[TROPHY_IDS.CHICKEN_DINNER] + '. Error -> ' + fetchError.message);
            });
          fns.summarizeGame(action, game.Score);
          logDebug(__filename, method, 'The game has been WON: \r\n' + action.outcomes.join('\r\n'));
        } else {
          action.outcomes.push('You move cautiously to the South.');
          pLoc.row++;
        }
        break;
      }
      case DIRS.EAST: {
        pLoc.col++;
        action.outcomes.push('You move cautiously to the East.');
        break;
      }
      case DIRS.WEST: {
        pLoc.col--;
        action.outcomes.push('You move cautiously to the West.');
        break;
      }
      default: {
        action.outcomes.push("You don't know where you want to go so you go nowhere.");
      }
    }
  } else {
    action.outcomes.push('You walk headlong into a wall.');
  }
  action.engram = engram;

  console.log(maze.generateTextRender(true, pLoc));
  game.Player.Location = pLoc;
  return Promise.resolve(action);
}
