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
  - [X] team names
    - [X] pool of adjectives and nouns
    - [X] option generator function
    - [X] choose team name on first ready up
    - [X] team name display
  - [X] upgrade
    - [X] lvl and next lvl slots stat above
    - [X] drag to upgrade, combine correctly
    - [X] can't upgrade past lvl 3
  - [X] abilities
    - [X] hover to see name and ability text
    - [X] ability stack (priority goes to power, tie if random)
    - [X] timing
      - [X] before battle starts
      - [X] before attack
      - [X] after attack
      - [X] on death
  - [X] battle speed
    - [X] UI (pause, play, fast)
    - [X] client goes through list of animation steps
  - [X] CR (tiers)
    - [X] dice assets
    - [X] dice UI above hires
    - [X] only show hires from unlocked tiers
    - [X] hp loss by turn/tier
  - [X] assets
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
  - [X] Animations
    - [X] basic attack
    - [X] basic take damage
    - [X] basic dead
    - [X] basic scoot up party after death
    - [X] basic ability
    - [X] basic move into battle
  - [ ] Art
    - [X] font
    - [X] top stat icons/emojis
    - [X] background market
    - [X] background battle
  - [ ] Code Refactor
    - [X] player object and lookup by id instead of array
    - [X] server battle calculates and sends list of steps
    - [X] battle display battleParty
    - [ ] cleanup
    - [X] omfg `structuredClone()` creates a deep copy.... wtf
    - [X] Node v18
    - [ ] parties/ids/indexes code smell
    - [ ] common but different name for cloned arrays
    - [ ] "battle" vs "parties"
    - [ ] need to clone at all? or change up what battleSteps sends...
    - [X] isDamaged reset
  - [X] Misc. QoL
    - [X] relative text sizes
    - [X] bigger slots/assets and slot positions relative to size
    - [X] cleanup comments from 0.0.1
    - [X] bigger/better top stat UI
    - [X] figure out how to scale ability text and wrap/justify
  - [ ] bugs/issues
    - [X] fix end of game display
    - [X] fix hp display on battle end
    - [X] redo battle display and battle result text colors for draw
    - [X] fix bug with ready and battle spamming
    - [X] need a failsafe end battle if both sides end with flumph or stirge (tie timer)
    - [ ] first move display getting cut short
    - [ ] move animations currently don't account for potential moving more than one slot or dying in middle
    - [ ] remove move step if no one needs to
    - [ ] mephit chain reaction not working? can't replicate
    - [X] skeleton resurrection can block mephit chain reaction -- no, it's b/c of "die in middle"
    - [X] clear reference to last dragged when going back to market
    - [ ] sleeping wears off if creature takes damage
    - [X] fix party name text overflow
    - [ ] increase size of pop up text box

- [ ] 0.0.3
  - [ ] items
  - [ ] freeze items
  - [ ] no drag to freeze?
  - [ ] assets
   - [ ] better lvl 1s
   - [ ] tier 2
   - [ ] tier 3
   - [ ] tier 4
   - [ ] tier 5
   - [ ] tier 6
  - [ ] increase tier every X turns
  - [ ] battle step overhaul
  - [ ] ability timing
    - [ ] on damage
    - [ ] on buy
    - [ ] on sell
    - [ ] on getting an item
    - [ ] on level up
    - [ ] end of market
  - [ ] Multiplayer
    - [ ] nedb database for login and stats tracking
    - [ ] start screen
      - [ ] login
      - [ ] join random lobby
      - [ ] join arena lobby
        - [ ] random pairings
        - [ ] duplicate battles if odd number
      - [ ] join lobby by id
  - [ ] Misc QoL
    - [ ] "The" party name fix for names like Xanathar's

- [ ] Art
  - [X] font
  - [ ] market background
  - [ ] battle background
  - [ ] end game background
  - [ ] refresh button
  - [ ] ready button
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
  - [ ] top stats
    - [ ] icons
    - [ ] background boxes
  - Assets 
    - [ ] tier 1
    - [ ] tier 2
    - [ ] tier 3
    - [ ] tier 4
    - [ ] tier 5
    - [ ] tier 6
  - Animations
    - [ ] enter battle (approach and fade in)
    - [ ] exit back to market fade out
    - [ ] player hp loss on loss
    - [ ] tier 1
    - [ ] tier 2
    - [ ] tier 3
    - [ ] tier 4
    - [ ] tier 5
    - [ ] tier 6
- [ ] Refactor / QoL
  - [ ] better scrollbar removal
  - [ ] show/drag monsters/times with .x/.y instead of iterating through slots
  - [ ] might need to stop using relative coords and have set locations/sizes for different resolutions...
- [ ] Balancing
  - [ ] some sort of data gathering for what is picked and what wins?

  ## Playtest Notes

  ### 0.0.2

  **Misc. Balance Thoughts**
  - Bear too strong -- maybe just bumps HP?
    - wow but 12 kobolds and 12 bears have the same sum total power + hp after abilities...
    - no still too strong. nerfing power
  - goblins suck compared to skeletons, 16% chance at lvl 1 vs 100% chance + extra... maybe should bump to 20% base?
  - skelly immune to spores atm, b/c they're "dead" -- kinda cool flavor
  - damn stirge basically can't be killed by anything with 1 power, unless abilities (spores), ah can also get stuck in infinite loop. Should have tie timer

  ### 0.0.1

  **6/17/22**
  - dupes party if you drag party slots after first battle
  - pulling from hires on return to market shows wrong unless refresh
  - server.js  index line 146 i of null -- why null?