# game-server

MazeMasterJS Game Server

# shared-library

The MazeMasterJS Game Server provides the API that creates and manages games.

## API Documentation

- get: '/game/count' - Returns a count of games currently in memory
- get: '/game/get' - Returns a list all games currently in memory (stubbed data)
- get: '/game/:gameId' - Returns the full game object for the matching gameId
- put: '/game/new/:mazeId/:teamId' - Creates a new, multiplayer team game in the given maze
- put: '/game/new/:mazeId/:teamId/:botId' - Creates a new, single-player bot game in the given maze

## TODO

- Implement percentage-based cache eviction routine that keeps a minimum amount of free-space available instead of the current FIFO model
- Ensure that cache entries for active games aren't evicted (add game state to value calculation?)
- Add logic to automatically end games after a certain period of inactivity (set GAMES_STATES.ABANDONED)

## Change Notes

### v0.3.0

- Routes added: /count, /get, /get:gameId, /new/:mazeId/:teamId, /new/:mazeId/:teamId/:botId
- Starting a new game will fail if the team (multi-player) or bot (single-player) already have an active game in memory
- Cache.fetchOrGet() function added - first attempts to pull from cache, then then from the service backing the cache. Note: For non-persisted object types (just Game, at the moment) objects, use Cache.fetchItem()

### v0.2.0

- Cache prioritization in place - cache elements are given a value based on hit count and last access time
- Caches sort elements on value when full, evicting least-value element if room is needed

### v0.1.0

- Basic express server shell created
- Simple FIFO caches for Game, Team, Score, Trophy, and Maze data in place
