# Super Auto Lich

Super Auto Pets reskinned for Dungeons and Dragons monsters.

Browser based version using p5.js and socket.io, hosted on glitch.

## Credits

Made by [August Luhrs](https://augustluhrs.art) and [Casey Conchinha](https://kccon.ch).

Super Auto Pets and the Dungeons and Dragons monsters are property of Team Wood Games and Wizards of the Coast respectively. We make no claim to either and only use their likenesses because we love them, plz no sue


## Roadmap

- [X] 0.0.1 MVP Prototype
  - [X] set up project and repo
  - [X] asset test
  - [X] battle test
    - [X] start from market
    - [X] auto battle
    - [X] layout / positioning
    - [X] server random party generation
    - [X] battle steps
    - [X] winner / end
    - [X] back to market
  - [X] market test
    - [X] layout / positioning
    - [X] random setup
    - [X] reset gold
    - [X] drag to buy
    - [X] drag and rearrange
    - [X] refresh (roll)
    - [X] ready up (send party and trigger battle)
  - [X] multiplayer test
    - [X] get/show enemy party
    - [X] check if both are ready, then start battle
  - [X] fix flip issue
  - [X] overall game progress
    - [X] starting market flow and send party
    - [X] turns
    - [X] player hp loss
    - [X] game loss/win
  - [X] put on glitch
  - [X] playtest bugs
    - [X] party dupe after first battle
    - [ ] refresh hires after battle (can't reproduce)
    - [X] server line 146 null (shouldn't happen...)

- [ ] 0.0.2
  - [ ] team names
    - [ ] pool of adjectives and nouns
    - [ ] generator
    - [ ] choose team name on first ready up
    - [ ] team name display
  - [X] upgrade
    - [X] lvl and next lvl slots stat above
    - [X] drag to upgrade, combine correctly
    - [X] can't upgrade past lvl 3
  - [ ] abilities
    - [ ] hover to see name, level, and ability text
    - [ ] timing
      - [ ] initial battle effect
      - [ ] before attack
      - [ ] on attack
      - [ ] on damage
      - [ ] on death
      - [ ] on buy
      - [ ] on sell
      - [ ] on getting an item
      - [ ] on level up
      - [ ] end of market
      - [ ] start of battle
  - [ ] battle speed
    - [ ] UI (pause, play, fast)
    - [ ] client goes through list of animation steps
  - [ ] CR (tiers)
    - [X] dice assets
    - [X] dice UI above hires
    - [X] only show hires from unlocked tiers
    - [X] hp loss by turn/tier
    - [ ] increase tier every X turns
  - [ ] assets
    - [X] placeholder level 1s
  - [X] freeze hires
    - [X] send hire array as argument instead of tracking freezes on server
    - [X] placeholder frozen overlay
    - [X] freeze slot
    - [X] drag to freeze
  - [X] hire stats
  - [X] sell
    - [X] drag to sell
    - [X] sell location
    - [X] sell return by level
  - [ ] Code Refactor
    - [X] player object and lookup by id instead of array
    - [X] fix bug with ready and battle spamming
    - [ ] server battle calculates and sends list of steps
  - [ ] Misc. QoL
    - [ ] relative text sizes
    - [X] bigger slots/assets and slot positions relative to size
    - [X] cleanup comments from 0.0.1
    - [X] fix hp display on battle end
    - [ ] bigger/better top stat UI

- [ ] 0.0.3
  - [ ] items
  - [ ] freeze items
- [ ] Multiplayer
  - [ ] nedb database for login and stats tracking
  - [ ] start screen
    - [ ] login
    - [ ] join random lobby
    - [ ] join arena lobby
      - [ ] random pairings
      - [ ] duplicate battles if odd number
    - [ ] join lobby by id

- [ ] Art
  - [ ] font
  - [ ] market background
  - [ ] battle background
  - [ ] end game background
  - [ ] slots
    - [ ] asset
    - [ ] layout
  - [ ] level/upgrades
  - [ ] power
  - [ ] hp
  - [ ] tiers
    - [ ] asset
    - [ ] layout
  - [ ] monster popups
    - [ ] background
    - [ ] layout
  - [ ] freezes
    - [ ] basic overlay for all monsters
  - Assets 
    - [ ] tier 1
    - [ ] tier 2
    - [ ] tier 3
    - [ ] tier 4
    - [ ] tier 5
    - [ ] tier 6
  - Animations
    - [ ] basic attack
    - [ ] basic take damage
    - [ ] basic dead
    - [ ] basic scoot up party after death
    - [ ] basic ability trigger
    - [ ] tier 1
    - [ ] tier 2
    - [ ] tier 3
    - [ ] tier 4
    - [ ] tier 5
    - [ ] tier 6
- [ ] QoL
  - [ ] better scrollbar removal
- [ ] Balancing
  - [ ] some sort of data gathering for what is picked and what wins?

  ## Playtest Notes

  ### 0.0.1

  **6/17/22**
  - dupes party if you drag party slots after first battle
  - pulling from hires on return to market shows wrong unless refresh
  - server.js  index line 146 i of null -- why null?