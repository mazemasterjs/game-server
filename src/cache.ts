import { MazeBase } from '@mazemasterjs/shared-library/MazeBase';
import { IMazeStub } from '@mazemasterjs/shared-library/IMazeStub';
import { Score } from '@mazemasterjs/shared-library/Score';
import { Team } from '@mazemasterjs/shared-library/Team';
import { Game } from '@mazemasterjs/shared-library/Game';

// initialize cache arrays
let mazes: Array<MazeBase> = new Array<MazeBase>(); // full mazes - added to when requested (TODO: Possible?)
let scores: Array<Score> = new Array<Score>(); // list of available scores
let mazeList: Array<IMazeStub> = new Array<IMazeStub>(); // list of available mazes

// initialize team and game tracking arrays
let teams: Array<Team> = new Array<Team>();
let games: Array<Game> = new Array<Game>();
