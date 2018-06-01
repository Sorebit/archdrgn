# ArchDragon bot

### Currently supports
- Login with data from config and session storage
- Gold digging scheduling
- Leveling up dragons in intervals
- Sending dragons on quests based on specified items
  + `config.user.items` is an array of items you want to look for (items can be found in knowledge/locations.json)
  + Each dragon will look for different items
  + `config.user.dragons[0]` will look for `config.user.items[0]`, `[1]` will look for `[1]` and so on
  + Currently it is only done **once on launch**
- Queuing actions to not overlap in time
- Fishing? (still needs to be tested)

### Usage
- `npm install`
- `node index [username]`

### Todo
- Save last successful gold and leveling to a file and use it to schedule on launch
- Figure out how to check if dragon was sent on mission
- Quest timing
- Map exploration
- Feeding
- Output coloring for readability

### Notes
This bot and game serves me only as a learning framework.

**Fishing**
- If nothing catched, server has some internal php error. Response then looks like this:
  + `Undefined offset: 0<br />File: map.controller.php<br />Line: 238{"points":0,"status":"OK","item":0,"item_name":null,"userAccountActive":false}`
- Otherwise it's just JSON
- For some reason this is what is used to post to fish
  + "fish" = "at the age old pond - a frog leaps into water - a deep resonance"

**Config files and launching**
- Config files are organized in `/config` directory
- For a user config to be recognized it has to be named `username.json` and placed in `/config/users` directory