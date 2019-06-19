# ArchDragon bot
| [**Play the game**](http://archdragon.com/) | [**Wiki**](https://github.com/Sorebit/archdrgn/wiki) |
| :-----------------------------------------: | :--------------------------------------------------: |

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
- Fishing
- Fighting with Red Rat (drops raw meat and leather) on successful leveling
- Output coloring for readability
- Scheduling gold and leveling based on generated files (seems to work; not much tested)

### Usage
- `npm install`
- `node index [username]`

### Todo
- Map exploration
- Figure out how to check if dragon was sent on mission
- Quest timing
- Feeding
- Note down items dropped by each monster
- Stop caring about this game; start caring about exams

## Notes
This bot and game serves me only as a learning framework and this code is getting out of control and dirty.

**Config files and launching**
- Config files are organized in `/config` directory
- For a user config to be recognized it has to be named `username.json` and placed in `/config/users` directory
- For scheduler to work properly there needs to be a `/config/schedule` directory
- Fun fact: Turns out there exists a user named `username`, whose password is `password`

**Fighting**
- As of now I use fighting mostly to speed up gathering data
- To enable fighting on successful level set `user.fight` to `true` in config

**Net errors**
- Currently when a request error occurs, queue breaks. I should fix that