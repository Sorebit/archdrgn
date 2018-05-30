# ArchDragon bot

### Currently supports
- Login with data from config and session storage
- Diging gold in intervals
- Leveling up dragons in intervals
- Sending dragons on quests based on specified items
  + `config.user.items` is an array of items you want to look for (items can be found in knowledge/locations.json)
  + Each dragon will look for different items
  + `config.user.dragons[0]` will look for `config.user.items[0]`, `[1]` will look for `[1]` and so on
  + Currently it is only done **once on launch**

### Usage
- `npm install`
- `npm start`

### Todo
- Figure out how to check if dragon was sent on mission
- Request queuing
- Quest timing
- Fishing
- Map exploration
- Feeding

### Notes
This bot and game serves me only as a learning framework.