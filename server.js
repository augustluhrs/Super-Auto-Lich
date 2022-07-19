/*
    ~ * ~ * ~ * 
    SERVER
    ~ * ~ * ~ * 
*/

//create server
let port = process.env.PORT || 8000;
let express = require('express');
let app = express();
let server = require('http').createServer(app).listen(port, function(){
  console.log('Server is listening at port: ', port);
});

//where we look for files
app.use(express.static('public'));

//create socket connection
let io = require('socket.io')(server);

//
// GAME VARIABLES
//
const Player = require("./modules/player").Player;
const Monster = require("./modules/monsters").Monster;
const monsters = require("./modules/monsters").monsters;
const Names = require("./modules/names").Names;
let players = {}; // holds all current players, their parties, their stats, etc.
// let battleStepTime = 1000; //interval it takes each battle step to take -- TODO, client speed (array of events?)
let tieTimer = 0;
let tieTimerMax = 8; //TODO test/think about more
let testLobby = "testLobby";

//
// SERVER EVENTS
//

//clients
var inputs = io.of('/')
//listen for anyone connecting to default namespace
inputs.on('connection', (socket) => {
  console.log('new input client!: ' + socket.id);

  //add entry to players object (search by id);
  players[socket.id] = new Player({id: socket.id, hires: refreshHires(1, [null, null, null]), lobby: testLobby});

  //send starting data
  socket.emit('goToMarket', players[socket.id]);
  socket.join(players[socket.id].lobby); //TODO placeholder just for testing

  //send possible team names
  socket.on("getPartyNames", () => {
    let [adjectives, nouns] = generatePartyNames();
    socket.emit("setPartyName", {nouns: nouns, adjectives: adjectives});
  });

  //if gold left, replaces hires with random hires
  socket.on("refreshHires", (data) => {
    let player = players[socket.id];
    if (player.gold > 0){ //get random monsters and send them to player's market
      //TODO: allow for frozen hires
      player.hires = data;
      player.gold--;
      socket.emit("newHires", {gold: player.gold, hires: refreshHires(player.tier, player.hires)});
      console.log("sent " + socket.id + "new hires");
    } else {
      console.log('not enough gold');
    }
  });

  //when player hires a monster
  socket.on("hireMonster", (data) => {
    let player = players[socket.id];
    player.party = data.party;
    player.gold -= 3;
    console.log(player.id + "has " + player.gold + " left");
    socket.emit("updateGold", {gold: player.gold});
  });

  //when player sells a monster
  socket.on("sellMonster", (data) => {
    let player = players[socket.id];
    player.party = data.party;
    player.gold += data.level;
    // player.gold += 1;
    console.log(player.id + "has " + player.gold + " left");
    socket.emit("updateGold", {gold: player.gold});
  });

  //on end turn from market, signals to server we're ready to battle
  //for test, just going to put in room on here instead of joining lobby at start, TODO
  socket.on("readyUp", (data) => {
    let player = players[socket.id];
    player.ready = true;
    player.hires = data.hires;
    player.party = data.party;
    player.battleParty = structuredClone(data.party);
    player.partyName = data.partyName;

    //join a lobby if not in one already
    // if (player.lobby == undefined){ 
      // player.lobby = testLobby;
    // socket.join(player.lobby);
    // }

    // check to see if both are ready, if so, send to battle
    let lobby = io.sockets.adapter.rooms.get(player.lobby);
    console.log(lobby);
    if (lobby.size == 2){ //size instead of length because its a set
      let enemyIsReady = false;
      let enemy = {};
      for (let id of lobby){
        console.log(id);
        if (id !== player.id) { //check to see if other player is ready
          let other = players[id];
          if (other.ready){
            enemy.id = other.id;
            enemy.battleParty = other.battleParty;
            enemyIsReady = true;
          } 
        }
      }
      //TODO need to do this less 1/2 and more player 1 player 2... 
      //TODO make less clunky... trims up the parties for better battle display
      if (enemyIsReady){
        //remove nulls from party so battle step works
        let party1 = player.battleParty;
        for(let i = 0; i < party1.length; i++){
          if (party1[i] == null){
            for (let j = i; j < party1.length - 1; j++){
              party1[j] = party1[j+1];
              if (j == party1.length - 2 && party1[j+1] !== null){
                party1[j+1] = null;
              }
            }
          }
        }
        for (let i = party1.length - 1; i >= 0; i--){
          if (party1[i] == null){
            party1.splice(i, 1);
          }
        }
        //reset indexes and add lichID
        for (let i = 0; i < party1.length; i++){
          party1[i].index = i;
          party1[i].lichID = player.id;
        }

        let party2 = enemy.battleParty;
        for(let i = 0; i < party2.length; i++){
          if (party2[i] == null){
            for (let j = i; j < party2.length - 1; j++){
              party2[j] = party2[j+1];
              if (j == party2.length - 2 && party2[j+1] !== null){
                party2[j+1] = null;
              }
            }
          }
        }
        for (let i = party2.length - 1; i >= 0; i--){
          if (party2[i] == null){
            party2.splice(i, 1);
          }
        }
        //reset indexes and add lichID
        for (let i = 0; i < party2.length; i++){
          party2[i].index = i;
          party2[i].lichID = enemy.id;
        }

        //reset here since we only check when starting battle
        players[player.id].ready = false;
        players[enemy.id].ready = false;

        //start battle sequence
        let battle = [{id: player.id, partyName: player.partyName, party: party1}, {id: enemy.id, partyName: players[enemy.id].partyName, party: party2}];
        let startParties = structuredClone(battle);

        io.to(player.lobby).emit("startBattle", {startParties: startParties, battleSteps: getBattleSteps(battle)});
      } else {
        socket.emit("waitingForBattle");
      }
    } else {
      socket.emit("waitingForBattle");
    }
  });

  //after battle timeout, send back to market, trigger tier stuff
  socket.on("goToMarket", () => {
    let player = players[socket.id];
    player.gold = 10;
    player.turn++;
    //adjust hpLoss and tier by turn number -- TODO: not doing tier up yet
    //SAP wiki: "The formula is tier X being unlockable in turn (2X-1)"
    if (player.turn >= 11){
      // player.tier = 6;
    } else if (player.turn >= 9) {
      // player.tier = 5;
      player.hpLoss = 3;
    } else if (player.turn >= 7) {
      // player.tier = 4;
    } else if (player.turn >= 5) {
      // player.tier = 3;
      player.hpLoss = 2;
    }
    else if (player.turn >= 3) {
      // player.tier = 2;
    }
    // player.ready = false; //wasn't doing this fast enough to prevent spamming battle errors
    socket.emit("goToMarket", {gold: player.gold, hp: player.hp, turn: player.turn, party: player.party, hires: refreshHires(player.tier, player.hires)}); //TODO just send player
  });

  //listen for this client to disconnect
  socket.on('disconnect', () => {
    console.log('input client disconnected: ' + socket.id);
    delete players[socket.id]; //TODO check to see if throws syntax error if strict https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete
  });

});

//
// FUNCTIONS
//

function getBattleSteps(battle){
  let copyParties = structuredClone(battle); //TODO need better names for these parties I keep making
  let startParties = structuredClone(battle);
  let battleSteps = [{parties: copyParties, action: "start"}]; //confusing because abilites are "before start", but start is always first TODO
  battleSteps = checkStartAbilities(startParties, "before start", battleSteps);
  battleSteps = battleStep(startParties, battleSteps, tieTimer); //silly naming
  return battleSteps;
}

function battleStep(battle, battleSteps, tieTimer){
  console.log("battleStep");
  // let currentNumMonsters = battle[0].party.length + battle[1].party.length; //TODO there's a better way to check if should tick tie timer
  let shouldTickTimer = true; //TODO there's a better way to check if should tick tie timer

  //check for before attack abilities
  let beforeAttackParties = structuredClone(battle);
  [battle, battleSteps] = checkAttackAbilities(beforeAttackParties, "before attack", battleSteps);

  //make copy and store in array for client display -- moving before so showing monster before effects not after
  let copyParties = structuredClone(battle);
  battleSteps.push({parties: copyParties, action: "attack"}); //hmm this timing is problematic TODO

  let party1 = battle[0].party;
  let party2 = battle[1].party;
  let p1ID = battle[0].id;
  let p2ID = battle[1].id;

  //apply damage, confirm attacks for abilities, and wake up if sleeping
  if (!party1[0].isSleeping){
    party2[0].currentHP -= party1[0].currentPower + party2[0].vulnerability; 
    party2[0].isDamaged = true;
    party1[0].hasAttacked = true;
  } else {
    party1[0].isSleeping = false;
  }
  if (!party2[0].isSleeping){
    party1[0].currentHP -= party2[0].currentPower + party1[0].vulnerability;
    party1[0].isDamaged = true;
    party2[0].hasAttacked = true;
  } else {
    party2[0].isSleeping = false;
  }

  //check for death 
  let hasBeenDeath = false;
  let deadMonsters = [];
  if (party1[0].currentHP <= 0){
    hasBeenDeath = true;
    party1[0].isDead = true;
    party1[0].isDamaged = false;
    party2[0].hasKilled = true;
    deadMonsters.push(party1[0]);
  }
  if (party2[0].currentHP <= 0){
    hasBeenDeath = true;
    party2[0].isDead = true;
    party2[0].isDamaged = false;
    party1[0].hasKilled = true;
    deadMonsters.push(party2[0]);
  }

  //send parties after damage
  let damageParties = structuredClone(battle);
  battleSteps.push({parties: damageParties, action: "damage"});
  //if damaged, wake up TODO

  //reset .isDamaged
  battle = resetMonsters(battle);

  //check for after attack abilities
  let afterAttackParties = structuredClone(battle);
  [battle, battleSteps] = checkAttackAbilities(afterAttackParties, "after attack", battleSteps);

  //check death abilities and move up animation before actual splice, if still fighting
  if (hasBeenDeath){
    let preDeathParties = structuredClone(battle);
    [battle, battleSteps] = checkDeathAbilities(preDeathParties, "after death", battleSteps, deadMonsters);
    if (preDeathParties[0].party.length > battle[0].party.length || preDeathParties[1].party.length > battle[1].party.length){ //prevent from sending move if no one actually was removed
      let postDeathParties = structuredClone(battle);
      battleSteps.push({parties: postDeathParties, action: "move"}); //going to have to hide first index...
    }
  }

  party1 = battle[0].party; //hmmmmmmmmmmmmmmmmmm
  party2 = battle[1].party;

  //move up party if death
  for (let i = party1.length - 1; i >= 0; i--){
    if (party1[i].isDead){
      party1.splice(i,1);
      shouldTickTimer = false;
    }
  }
  //reset indexes
  for (let i = 0; i < party1.length; i++){
    party1[i].index = i;
  }
  for (let i = party2.length - 1; i >= 0; i--){
    if (party2[i].isDead){
      party2.splice(i,1);
      shouldTickTimer = false;
    }
  }
  for (let i = 0; i < party2.length; i++){
    party2[i].index = i;
  }

  // battle[0].party = party1; //is this redundant b/c references? TODO
  // battle[1].party = party2;
  let p1 = players[p1ID];
  let p2 = players[p2ID];


  let finalParties = structuredClone(battle);
  //check for end, send next step or end event
  if ((party1.length == 0 && party2.length == 0) || tieTimer >= tieTimerMax) { //tie or check for tie timer
    battleSteps.push({parties: finalParties, action: "tie"});
    return battleSteps;
  } else if (party1.length == 0){ //player1 loss
    p1.hp -= p1.hpLoss;
    if (p1.hp <= 0) { //player1 lose game
      battleSteps.push({parties: finalParties, action: "gameOver", winner: p2ID});
      return battleSteps; //not needed but don't want errors
    } else {
      battleSteps.push({parties: finalParties, action: "battleOver"});
      return battleSteps;
    }
  } else if (party2.length == 0){ //player2 loss
    p2.hp -= p2.hpLoss;
    if (p2.hp <= 0) { //player2 lose game
      battleSteps.push({parties: finalParties, action: "gameOver", winner: p1ID});
      return battleSteps;
    } else {
      battleSteps.push({parties: finalParties, action: "battleOver"});
      return battleSteps;
    }
  } else {
    //check to see if a death has happened, if not, tick tieTimer (ugh this skelly...)
    if (shouldTickTimer){
      tieTimer++;
    }
    battle = resetMonsters(battle);
    return battleStep(battle, battleSteps, tieTimer);
  }
}

//ability function -- not trying to optimize yet, though TODO could have all abilities in one?
function checkStartAbilities(parties, timing, battleSteps){ //needs parties, timing, and battleSteps array
  let p1 = parties[0].id;
  let p2 = parties[1].id;
  let party1 = parties[0].party;
  let party2 = parties[1].party;

  //get deep copy before any changes
  let copyParties = structuredClone(parties);

  //check for abilities that match the timing and make new array of monsters that need to act
  let actingMonsters = [];
  let maxPower = 0;
  for (let i = 0; i < party1.length; i++){
    if (party1[i].timing == timing){
      party1[i].lichID = p1;
      if (party1[i].currentPower > maxPower){
        maxPower = party1[i].currentPower;
      }
      actingMonsters.push(party1[i]);
    }
  }
  for (let i = 0; i < party2.length; i++){
    party2[i].lichID = p2;
    if (party2[i].currentPower > maxPower){
      maxPower = party2[i].currentPower;
    }
    actingMonsters.push(party2[i]);
  }

  //sort array by strength, ties are random
  let sortedMonsters = [];
  //prob an existing sorting algorithm for this but w/e
  for (let i = maxPower; i >= 0; i--){ //TODO this won't work if there are effects that bring a monster to negative power
    let powerArray = [];
    for (let monster of actingMonsters){ //code smell TODO -- something about ids, parties, indexes
      if (monster.currentPower == i) {
        powerArray.push(monster);
      }
    }
    sortedMonsters.push(powerArray);
  }
  for (let powerArray of sortedMonsters){
    if (powerArray.length > 1){
      shuffleArray(powerArray);
    }
  }
  //now we have all monsters who are acting in this stage of the battle, with stronger monsters going first

  //need to do the abilities, then check for damage/death...
  for (let powerArray of sortedMonsters) {
    for (let monster of powerArray){
      //would be nice to just call the .ability() method, but not sure how to abstract what gets returned for all cases...
      if (!monster.isNullified) { //have to check this here in case the flumph goes before in the array (even though this is only at start, for future)
        if (monster.name == "cavebear") {
          monster.isSleeping = true;
          //increases stats by level (+50/100/150%, rounded down)
          // monster.currentPower += Math.floor(monster.currentPower * monster.level * 0.5); //nerf
          monster.currentHP += Math.floor(monster.currentHP * monster.level * 0.5);
          let partiesAtThisStage = structuredClone(parties);
          battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: monster}); //idk i don't like overloading the object like this, but w/e.... TODO
        } else if (monster.name == "kobold") {
          let party;
          if (parties[0].id == monster.lichID){
            party = parties[0].party;
          } else {
            party = parties[1].party;
          }
          // console.log(party);

          let numKobolds = 0;
          // console.log(numKobolds);
          for (let m of party){
            if (m.name == "kobold"){
              numKobolds++;
            }
          }
          // console.log(numKobolds);
          if (numKobolds > 1){
            monster.currentPower += numKobolds - 1; //TODO even with -1 this could be way OP
            monster.currentHP += numKobolds - 1;
            let partiesAtThisStage = structuredClone(parties);
            battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: monster});
          }
        }
      }
    }
  }

  return battleSteps;
}

//mid-battle abilities
function checkAttackAbilities(parties, timing, battleSteps){ //needs parties, timing, and battleSteps array
  let p1ID = parties[0].id;
  let p2ID = parties[1].id;
  let party1 = parties[0].party;
  let party2 = parties[1].party;

  //get deep copy before any changes
  // let copyParties = structuredClone(parties);

  //check for abilities that match the timing and make new array of monsters that need to act
  let actingMonsters = [];
  let maxPower = 0;

  if (party1[0].timing == timing){
    // party1[0].lichID = p1ID;
    if (party1[0].currentPower > maxPower){
      maxPower = party1[0].currentPower;
    }
    actingMonsters.push(party1[0]);
  }
  // party2[0].lichID = p2ID;
  if (party2[0].currentPower > maxPower){
    maxPower = party2[0].currentPower;
  }
  actingMonsters.push(party2[0]);

  //sort array by strength, ties are random
  let sortedMonsters = [];
  //prob an existing sorting algorithm for this but w/e
  for (let i = maxPower; i >= 0; i--){ //TODO this won't work if there are effects that bring a monster to negative power
    let powerArray = [];
    for (let monster of actingMonsters){ //code smell TODO -- something about ids, parties, indexes
      if (monster.currentPower == i) {
        powerArray.push(monster);
      }
    }
    sortedMonsters.push(powerArray);
  }
  for (let powerArray of sortedMonsters){
    if (powerArray.length > 1){
      shuffleArray(powerArray);
    }
  }
  //now we have all monsters who are acting in this stage of the battle, with stronger monsters going first

  //need to do the abilities, then check for damage/death...
  for (let powerArray of sortedMonsters) {
    for (let monster of powerArray){
      //would be nice to just call the .ability() method, but not sure how to abstract what gets returned for all cases...
      if (!monster.isNullified) { //have to check this here in case the flumph goes before in the array (even though this is only at start, for future)
        if (monster.name == "goblin") { //TODO should this stop attacking or negate damage??
          //random chance to have opponent not attack (20%/40%/60%)
          if (Math.random() < monster.level * 0.2) {
            if (monster.lichID == p1ID) {
              party2[0].isSleeping = true; //TODO better name for not attacking
              let partiesAtThisStage = structuredClone(parties);
              battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: monster});
            } else if (monster.lichID == p2ID) {
              party1[0].isSleeping = true;
              let partiesAtThisStage = structuredClone(parties);
              battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: monster});
            }
          }
        } else if (monster.name == "stirge") {
          //if stirge survives the attack, heals (1/2/3) HP
          if(!monster.isDead && monster.hasAttacked){
            monster.currentHP += monster.level;
            monster.hasAttacked = false; //TODO not sure if this is necessary/right
            let partiesAtThisStage = structuredClone(parties);
            battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: monster});
          }
        } else if (monster.name == "gnoll") {
          if(!monster.isDead && monster.hasKilled){
            let party, otherParty;
            for (let i = 0; i < party1.length; i++){
              if (party1[i].id == monster.id){
                party = party1;
                otherParty = party2;
              }
            }
            for (let i = 0; i < party2.length; i++){
              if (party2[i].id == monster.id){
                party = party2;
                otherParty = party1;
              }
            }
            let partiesAtThisStage = structuredClone(parties);
            battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: monster});

            //if gnoll kills, makes (1/2/3) attacks and each has a 25% chance of hitting ally (what if at end? fine, b/c enemy may not have enough to make it worth)
            for (let i = 0; i < monster.level; i++){
              //options are, determine if bloodBlind, if bloodBlind, check for ally, if no ally, miss
              //or if not ally, auto hit
              if (party.length == 1){ //has no allies to target
                for (let j = 0; j < otherParty.length; j++){
                  if (!otherParty[j].isDead){
                    otherParty[j].currentHP -= monster.currentPower;
                    if (otherParty[j].currentHP <= 0){
                      otherParty[j].isDead = true;
                    } else {
                      otherParty[j].isDamaged = true;
                    }
                    break;
                  }
                }
              } else { //chance of hitting ally
                if (Math.random() < 0.20) { //blood blind, hits ally
                  for (let j = monster.index - 1; j < party.length; j++){
                    if (!party[j].isDead){
                      party[j].currentHP -= monster.currentPower;
                      if (party[j].currentHP <= 0){
                        party[j].isDead = true;
                      } else {
                        party[j].isDamaged = true;
                      }
                      break;
                    }
                  }
                } else { //attacks next enemy in line that's healthy
                  for (let j = 0; j < otherParty.length; j++){
                    if (!otherParty[j].isDead){
                      otherParty[j].currentHP -= monster.currentPower;
                      if (otherParty[j].currentHP <= 0){
                        otherParty[j].isDead = true;
                      } else {
                        otherParty[j].isDamaged = true;
                      }
                      break;
                    }
                  }
                }
              }
              
            }
            let rampagedParties = structuredClone(parties);
            battleSteps.push({parties: rampagedParties, action: "damage"});
            parties = resetMonsters(parties);
          }
        } 
        
      }
    }
  }
  return [structuredClone(parties), battleSteps];
}

//after death abilities
function checkDeathAbilities(parties, timing, battleSteps, deadMonsters){
  let p1ID = parties[0].id;
  let p2ID = parties[1].id;
  let party1 = parties[0].party;
  let party2 = parties[1].party;

  //check for abilities that match the timing and make new array of monsters that need to act
  let actingMonsters = [];
  let maxPower = 0;
  for (let monster of deadMonsters){
    if (monster.timing == timing){
      if (monster.currentPower > maxPower){
        maxPower = monster.currentPower;
      }
      actingMonsters.push(monster);
    }
  }
  // console.log(deadMonsters);
  //sort array by strength, ties are random
  let sortedMonsters = [];
  //prob an existing sorting algorithm for this but w/e
  for (let i = maxPower; i >= 0; i--){ //TODO this won't work if there are effects that bring a monster to negative power
    let powerArray = [];
    for (let monster of actingMonsters){ //code smell TODO -- something about ids, parties, indexes
      if (monster.currentPower == i) {
        powerArray.push(monster);
      }
    }
    sortedMonsters.push(powerArray);
  }
  for (let powerArray of sortedMonsters){
    if (powerArray.length > 1){
      shuffleArray(powerArray);
    }
  }
  //now we have all monsters who are acting in this stage of the battle, with stronger monsters going first
  // console.log(sortedMonsters);
  //need to do the abilities, then check for damage/death...
  //moving dead monsters here, so will do all first dead monsters, then subsequent dead, instead of nested, skelly issue
  let deadMonsters2 = [];
  let needsMove = false;
  for (let powerArray of sortedMonsters) {
    for (let monster of powerArray){
      //would be nice to just call the .ability() method, but not sure how to abstract what gets returned for all cases...
      if (!monster.isNullified) { //have to check this here in case the flumph goes before in the array (even though this is only at start, for future)
        if (monster.name == "skeleton") {
          //spawns x/x on death, with chance to come back after each death, higher chance with level (/2, /3, /4)?
          //just going to replace stats rn so won't have to deal with adding to array
          let skelly;
          for (let i = 0; i < party1.length; i++){
            if (party1[i].id == monster.id){
              skelly = party1[i];
            }
          }
          for (let i = 0; i < party2.length; i++){
            if (party2[i].id == monster.id){
              skelly = party2[i];
            }
          }
          if (Math.random() < skelly.spawnChance) {
            skelly.currentHP = skelly.level;
            skelly.currentPower = skelly.level;
            skelly.spawnChance -= skelly.spawnChance / (skelly.level + 1);
            skelly.isDead = false;
            let partiesAtThisStage = structuredClone(parties);
            battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: skelly});
          } else{
            needsMove = true;
          }
        } else if (monster.name == "vegepygmy") {
          //makes alive enemy monsters vulnerable (+1 w/ each level)
          //gotta be a better way to do this TODO
          let otherParty;
          for (let i = 0; i < party1.length; i++){
            if (party1[i].id == monster.id){
              otherParty = party2;
            }
          }
          for (let i = 0; i < party2.length; i++){
            if (party2[i].id == monster.id){
              otherParty = party1;
            }
          }
          let partiesAtThisStage = structuredClone(parties);
          battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: monster});
          let numInfected = monster.level;
          for (let i = 0; i < otherParty.length; i++){
            // console.log(otherParty[i].name);
            if (otherParty[i].isDead) {
              continue;
            } else {
              // otherParty.isVulnerable = true;
              otherParty[i].vulnerability = 3;
              otherParty[i].currentItem = "spores";
              numInfected --;
              if (numInfected <= 0){
                break;
              }
            }
          }
        } else if (monster.name == "flumph") {
          //cancels abilities of enemy monsters
          let otherParty;
          for (let i = 0; i < party1.length; i++){
            if (party1[i].id == monster.id){
              otherParty = party2;
            }
          }
          for (let i = 0; i < party2.length; i++){
            if (party2[i].id == monster.id){
              otherParty = party1;
            }
          }
          // console.log(otherParty);
          let partiesAtThisStage = structuredClone(parties);
          battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: monster});
          let numInfected = monster.level;
          for (let i = 0; i < otherParty.length; i++){
            if (otherParty[i].isDead) {
              continue;
            } else {
              console.log(otherParty[i].name + " nullified");
              otherParty[i].isNullified = true;
              numInfected --;
              if (numInfected <= 0){
                break;
              }
            }
          }
        } else if (monster.name == "mephit"){
          //needs enemy to move up if dead? no... what if enemy is a mephit? hmm... splash damage
          //on death, deals damage to adjacent enemies (3/6/9?) -- ooh can backfire if sniped
          needsMove = true;
          let mephitIndex = 0;
          let party, otherParty;
          for (let i = 0; i < party1.length; i++){
            if (party1[i].id == monster.id){
              mephitIndex = i;
              party = party1;
              otherParty = party2;
            }
          }
          for (let i = 0; i < party2.length; i++){
            if (party2[i].id == monster.id){
              mephitIndex = i;
              party = party2;
              otherParty = party1;
            }
          }
          let partiesAtThisStage = structuredClone(parties);
          battleSteps.push({parties: partiesAtThisStage, action: "ability", monster: monster});
          //find adjacent monsters and deal them damage
          let hasDealtDamage = false;
          
          //need to damage next in line in either direction, if 0, flip to other party
          //left
          for (let i = mephitIndex + 1; i < party.length; i++){
            if (party[i] != null && !party[i].isDead) {
              party[i].currentHP -= (monster.level * 3) + party[i].vulnerability;
              if (party[i].currentHP <= 0){
                party[i].isDead = true;
                deadMonsters2.push(party[i]);
              } else {
                party[i].isDamaged = true;
              }
              hasDealtDamage = true;
              break;
            }
          }
          //right
          let needsToFlip = true;
          for (let i = mephitIndex - 1; i >= 0; i--) {
            if (party[i] != null && !party[i].isDead) {
              party[i].currentHP -= (monster.level * 3) + party[i].vulnerability;
              if (party[i].currentHP <= 0){
                party[i].isDead = true;
                deadMonsters2.push(party[i]);
              } else {
                party[i].isDamaged = true;
              }
              hasDealtDamage = true;
              needsToFlip = false;
              break;
            }
          }
          if (needsToFlip){
            for (let i = 0; i < otherParty.length; i++) {
              if (otherParty[i] != null && !otherParty[i].isDead) {
                otherParty[i].currentHP -= (monster.level * 3) + otherParty[i].vulnerability;
                if (otherParty[i].currentHP <= 0){
                  otherParty[i].isDead = true;
                  deadMonsters2.push(otherParty[i]);
                } else {
                  otherParty[i].isDamaged = true;
                }
                hasDealtDamage = true;
                break;
              }
            }
          }

          if (hasDealtDamage){
            let damagedParties = structuredClone(parties);
            battleSteps.push({parties: damagedParties, action: "damage"});
            parties = resetMonsters(parties); //TODO check if this is okay time to do this
          }
      
        }
        //other death monsters TODO
      }
    }
  }

  if (deadMonsters2.length > 0){
    // console.log("dm2");
    // console.log(deadMonsters2);
    [parties, battleSteps] = checkDeathAbilities(parties, "after death", battleSteps, deadMonsters2);
    // party1 = battle[0].party;
    // party2 = battle[1].party;

    //TODO code smell
    party1 = parties[0].party;
    party2 = parties[1].party;
    // console.log(party1);
    // console.log("asdfadf \n\n\n");
    // console.log(party2);
    // parties[0].party = party1;
    // parties[1].party = party2;
  }

  //this isnt' working -- all bunched up at end, eliminating for now TODO
  // if (needsMove){
  //   let postDeathParties = structuredClone(parties);
  //   battleSteps.push({parties: postDeathParties, action: "move"}); //going to have to hide first index...  
  //   //move animation will be off if jumping more than one slot or death in middle... TODO
  // }
  

  //fine b/c only happening once, no matter how many death abilities?
  //move up party if death
  for (let i = party1.length - 1; i >= 0; i--){
    if (party1[i].isDead){
      party1.splice(i,1);
      console.log("splice");
    }
  }
  //reset indexes and TODO attack/kill bools -- not sure if this is where this should go
  for (let i = 0; i < party1.length; i++){
    party1[i].index = i;
    party1[i].hasAttacked = false;
    party1[i].hasKilled = false;
  }
  for (let i = party2.length - 1; i >= 0; i--){
    if (party2[i].isDead){
      party2.splice(i,1);
      console.log("splice");
    }
  }
  for (let i = 0; i < party2.length; i++){
    party2[i].index = i;
    party2[i].hasAttacked = false;
    party2[i].hasKilled = false;
  }
  // return [structuredClone(parties), battleSteps];
  // console.log("returning from death function");
  // console.log(battleSteps);
  return [parties, battleSteps];
}

//hmm TODO resets monster properties that should refresh after certain steps...
function resetMonsters(parties){
  for (let monster of parties[0].party){
    monster.isDamaged = false;
  }
  for (let monster of parties[1].party){
    monster.isDamaged = false;
  }
  return parties;
}

function refreshHires(tier, hires){
  for (let i = 0; i < hires.length; i++){
    if (hires[i] == null || !hires[i].isFrozen) {
      //select randomly from all unlocked tiers
      let randomTier = Math.floor(Math.random()*tier); //monster array starts at 0 for tier 1, should be fine
      let RandomMonster = monsters[randomTier][Math.floor(Math.random()*monsters[randomTier].length)];
      hires[i] = new RandomMonster({index: i});
    }
  }
  return hires;
}

//generate party names
function generatePartyNames(){
  let nouns = [];
  let adjectives = [];
  let names = structuredClone(Names);
  for (let i = 0; i < 3; i++){
    let n = Math.floor(Math.random() * names.nouns.length);
    nouns.push(names.nouns[n]);
    names.nouns.splice(n, 1); //will this delete the reference??
    let a = Math.floor(Math.random() * names.adjectives.length);
    adjectives.push(names.adjectives[a]);
    names.adjectives.splice(a, 1);
  }
  console.log(nouns);
  console.log(adjectives);
  return [adjectives, nouns];
}

// Randomize array in-place using Durstenfeld shuffle algorithm
// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
  }
}
