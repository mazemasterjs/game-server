import * as fns from '../funcs';
import { Game } from '@mazemasterjs/shared-library/Game';
import { grantTrophy, logDebug } from '../funcs';
import { IAction } from '@mazemasterjs/shared-library/Interfaces/IAction';
import { PLAYER_STATES, TROPHY_IDS, CELL_TAGS, MONSTER_TAGS } from '@mazemasterjs/shared-library/Enums';
import GameLang from '../GameLang';
import { format } from 'util';

export async function doWait(game: Game, langCode: string): Promise<IAction> {
  logDebug(__filename, `doWait(${game.Id}, ${langCode})`, 'Player has issued the STAND command.');
  const startScore = game.Score.getTotalScore();
  const data = GameLang.getInstance(langCode);
  const outcomes = game.Actions[game.Actions.length - 1].outcomes;
  const cell = game.Maze.getCell(game.Player.Location);
  const moveCost = 1;
  if (!!(game.Player.State & PLAYER_STATES.STUNNED)) {
    outcomes.push(data.outcomes.stunnedWait);
    game.Player.removeState(PLAYER_STATES.STUNNED);
  } else if (!!(cell.Tags & CELL_TAGS.MONSTER)) {
    game.Monsters.forEach(monster => {
      const monsterType = MONSTER_TAGS[monster.getTag()];
      if (monster.Location.row === cell.Location.row && monster.Location.col === cell.Location.col) {
        outcomes.push(format(data.outcomes.monsterWait, monsterType));
      }
    });
  } else {
    outcomes.push(data.outcomes.wait);
  }

  return Promise.resolve(fns.finalizeAction(game, moveCost, startScore, langCode));
}
