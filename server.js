/*
    ~ * ~ * ~ * 
    SERVER
    ~ * ~ * ~ * 
*/

// structured clone for node 16
const structuredClone = require('realistic-structured-clone');

//create server
let port = process.env.PORT || 8000;
let express = require('express');
const e = require('express');
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
const Lobby = require("./modules/lobby").Lobby;
let players = {}; // holds all current players, their parties, their stats, etc.
let tieTimer = 0;
let tieTimerMax = 8; //TODO test/think about more
let testLobby = "testLobby";
let lobbies = {}; //mainly for checking for player counts

//
// SERVER EVENTS
//

//clients
var inputs = io.of('/')
//listen for anyone connecting to default namespace
inputs.on('connection', (socket) => {
  console.log('new input client!: ' + socket.id);

  //add entry to players object (search by id);
  players[socket.id] = new Player({id: socket.id, hires: refreshHires(1, [null, null, null], socket.id)});

  //create a lobby
  socket.on("createLobby", (data) => {
    let newLobby = new Lobby({lobbyName: data.lobbyName, numPlayers: data.numPlayers});
    players[socket.id].userName = data.userName;
    players[socket.id].lobbyName = data.lobbyName;
    // newLobby.players[socket.id] = players[socket.id]; //hmm
    newLobby.players.push(players[socket.id]); //hm
    lobbies[newLobby.lobbyName] = newLobby; //hmmmm
    socket.join(newLobby.lobbyName);
    socket.emit("waitingForLobby", newLobby);
  });
  
  //join a lobby
  socket.on("joinLobby", (data) => {
    console.log(data.userName + " joining " + data.lobbyName);
    players[socket.id].userName = data.userName;
    players[socket.id].lobbyName = data.lobbyName;
    if (lobbies[data.lobbyName] != undefined){
      let lobby = lobbies[data.lobbyName];
      // lobby.players[socket.id] = players[socket.id]; //hmm/
      lobby.players.push(players[socket.id]);
      socket.join(lobby.lobbyName);
      
      if (lobby.players.length == lobby.numPlayers) {
        console.log("STARTING LOBBY " + lobby.lobbyName);
        for (let player of lobby.players){
          // let player = players[p.id]; //TODO check to make sure reference is fine
          io.to(player.id).emit("goToMarket", {gold: player.gold, hp: player.hp, turn: player.turn, party: player.party, hires: refreshHires(player.tier, player.hires, player.id)});
        }
        //resetting lobby.players b/c that's the new ready check
        lobby.players = [];
      } else {
        io.to(lobby.lobbyName).emit("waitingForLobby", lobby);
      }
    } else {
      socket.emit("lobbyJoinError", data);
    }
  });

  //send possible team names
  socket.on("getPartyNames", () => {
    let [adjectives, nouns] = generatePartyNames();
    socket.emit("setPartyName", {nouns: nouns, adjectives: adjectives});
  });

  //if gold left, replaces hires with random hires
  socket.on("refreshHires", (data) => {
    let player = players[socket.id];
    if (player.gold > 0){ //get random monsters and send them to player's market
      player.hires = data;
      player.gold--;
      socket.emit("newHires", {gold: player.gold, hires: refreshHires(player.tier, player.hires, player.id)});
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
    // player.ready = true;
    player.hires = data.hires;
    player.party = data.party;
    player.battleParty = structuredClone(data.party);
    player.partyName = data.partyName;

    //now just sending party to lobby waiting and triggering when all are there since might be >2
    // lobbies[player.lobbyName].parties.push({id: socket.id, party: player.battleParty});
    lobbies[player.lobbyName].players.push(player); //changing parties to just being player objects
    checkLobbyForReady(player);
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
    socket.emit("goToMarket", {gold: player.gold, hp: player.hp, turn: player.turn, party: player.party, hires: refreshHires(player.tier, player.hires, player.id)}); //TODO just send player
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

function getBattleSteps(pair){
  let numLost = 0; //for reducing players in lobby and sending final win msg
  let clonePair = structuredClone(pair); //TODO need better names for these parties I keep making
  let startPair = structuredClone(pair);
  let battleSteps = [{pair: clonePair, action: "start"}]; //confusing because abilites are "before start", but start is always first TODO just make it "on start" instead
  ([pair, battleSteps] = checkStartAbilities(startPair, "before start", battleSteps));

  ([battleSteps, numLost] = battleStep(startPair, battleSteps, tieTimer)); //wtf "Note: The parentheses ( ... ) around the assignment statement are required when using object literal destructuring assignment without a declaration."

  return [battleSteps, numLost];
}

function battleStep(pair, battleSteps, tieTimer){
  let numLost = 0;
  console.log("battleStep");
  let shouldTickTimer = true; //TODO there's a better way to check if should tick tie timer

  //check for before attack abilities
  let beforeAttackPair = structuredClone(pair);
  ([pair, battleSteps] = checkAttackAbilities(beforeAttackPair, "before attack", battleSteps));

  //make copy and store in array for client display -- moving before so showing monster before effects not after
  let attackPair = structuredClone(pair);
  battleSteps.push({pair: attackPair, action: "attack"}); //hmm this timing is problematic TODO

  let party1 = pair[0].battleParty;
  let party2 = pair[1].battleParty;

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
  let damagePair = structuredClone(pair);
  battleSteps.push({pair: damagePair, action: "damage"});
  //if damaged, wake up TODO

  //reset .isDamaged
  pair = resetMonsters(pair);

  //check for after attack abilities
  let afterAttackPair = structuredClone(pair);
  ([pair, battleSteps] = checkAttackAbilities(afterAttackPair, "after attack", battleSteps));

  //check death abilities and move up animation before actual splice, if still fighting
  if (hasBeenDeath){
    shouldTickTimer = false;
    let preDeathPair = structuredClone(pair);
    ([pair, battleSteps] = checkDeathAbilities(preDeathPair, "after death", battleSteps, deadMonsters));
    if (preDeathPair[0].battleParty.length > pair[0].battleParty.length || preDeathPair[1].battleParty.length > pair[1].battleParty.length){ //prevent from sending move if no one actually was removed
      let postDeathPair = structuredClone(pair);
      battleSteps.push({pair: postDeathPair, action: "move"}); //going to have to hide first index...
    }
  }

  let p1 = players[pair[0].id]; //hmmmm
  let p2 = players[pair[1].id]; //hmmmm
  party1 = pair[0].battleParty; //hmmm
  party2 = pair[1].battleParty;

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

  let finalPair = structuredClone(pair);
  //check for end, send next step or end event
  if ((party1.length == 0 && party2.length == 0) || tieTimer >= tieTimerMax) { //tie or check for tie timer
    battleSteps.push({pair: finalPair, action: "tie"});
    return [battleSteps, numLost];
  } else if (party1.length == 0){ //player1 loss
    p1.hp -= p1.hpLoss;
    if (p1.hp <= 0) { //player1 lose game
      numLost++;
      battleSteps.push({pair: finalPair, action: "gameOver", winner: p2.id, numPlayersInLobby: lobbies[pair[0].lobbyName].players.length});
      return [battleSteps, numLost]; //not needed but don't want errors
    } else {
      battleSteps.push({pair: finalPair, action: "battleOver"});
      return [battleSteps, numLost];
    }
  } else if (party2.length == 0){ //player2 loss
    //only if not an odd round
    if (pair[2].length == 2){
      p2.hp -= p2.hpLoss;
    }
    if (p2.hp <= 0) { //player2 lose game
      numLost++;
      battleSteps.push({pair: finalPair, action: "gameOver", winner: p1.id, numPlayersInLobby: lobbies[pair[0].lobbyName].players.length});
      return [battleSteps, numLost];
    } else {
      battleSteps.push({pair: finalPair, action: "battleOver"});
      return [battleSteps, numLost];
    }
  } else {
    //check to see if a death has happened, if not, tick tieTimer (ugh this skelly...)
    if (shouldTickTimer){
      tieTimer++;
    } else {
      tieTimer = 0;
    }
    pair = resetMonsters(pair);
    return battleStep(pair, battleSteps, tieTimer);
    // return [battleStep(pair, battleSteps, tieTimer), numLost];
  }
}

//ability function -- not trying to optimize yet, though TODO could have all abilities in one?
function checkStartAbilities(pair, timing, battleSteps){ //needs parties, timing, and battleSteps array
  // let p1 = parties[0].id;
  // let p2 = parties[1].id;
  let party1 = pair[0].battleParty;
  let party2 = pair[1].battleParty;
  let sortedMonsters = getActingMonsters(timing, party1, party2);

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
          let pairAtThisStage = structuredClone(pair);
          battleSteps.push({pair: pairAtThisStage, action: "ability", monster: monster}); //idk i don't like overloading the object like this, but w/e.... TODO
        } else if (monster.name == "kobold") {
          let party;
          if (pair[0].id == monster.lichID){
            party = pair[0].battleParty;
          } else {
            party = pair[1].battleParty;
          }

          let numKobolds = 0;
          for (let m of party){
            if (m.name == "kobold"){
              numKobolds++;
            }
          }

          if (numKobolds > 1){
            // monster.currentPower += numKobolds - 1; //TODO even with -1 this could be way OP
            // monster.currentHP += numKobolds - 1;
            monster.currentPower += numKobolds;
            monster.currentHP += numKobolds;
            let pairAtThisStage = structuredClone(pair);
            battleSteps.push({pair: pairAtThisStage, action: "ability", monster: monster});
          }
        }
      }
    }
  }

  return [pair, battleSteps];
}

//mid-battle abilities
function checkAttackAbilities(pair, timing, battleSteps){ //needs parties, timing, and battleSteps array
  // let p1ID = parties[0].id;
  // let p2ID = parties[1].id;
  let party1 = pair[0].battleParty;
  let party2 = pair[1].battleParty;

  let sortedMonsters = getActingMonsters(timing, party1, party2);
  
  //need to do the abilities, then check for damage/death...
  for (let powerArray of sortedMonsters) {
    for (let monster of powerArray){
      //would be nice to just call the .ability() method, but not sure how to abstract what gets returned for all cases...
      if (!monster.isNullified) { //have to check this here in case the flumph goes before in the array (even though this is only at start, for future)
        if (monster.name == "goblin") { //TODO should this stop attacking or negate damage??
          //random chance to have opponent not attack (20%/40%/60%)
          if (Math.random() < monster.level * 0.2) {
            if (monster.lichID == pair[0].id) {
              party2[0].isSleeping = true; //TODO better name for not attacking
              let pairAtThisStage = structuredClone(pair);
              battleSteps.push({pair: pairAtThisStage, action: "ability", monster: monster});
            } else if (monster.lichID == pair[1].id) {
              party1[0].isSleeping = true;
              let pairAtThisStage = structuredClone(pair);
              battleSteps.push({pair: pairAtThisStage, action: "ability", monster: monster});
            }
          }
        } else if (monster.name == "stirge") {
          //if stirge survives the attack, heals (1/2/3) HP
          if(!monster.isDead && monster.hasAttacked){
            monster.currentHP += monster.level;
            monster.hasAttacked = false; //TODO not sure if this is necessary/right
            let pairAtThisStage = structuredClone(pair);
            battleSteps.push({pair: pairAtThisStage, action: "ability", monster: monster});
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
            let pairAtThisStage = structuredClone(pair);
            battleSteps.push({pair: pairAtThisStage, action: "ability", monster: monster});

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
                  for (let j = monster.index + 1; j < party.length; j++){
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
            let rampagedPair = structuredClone(pair);
            battleSteps.push({pair: rampagedPair, action: "damage"});
            pair = resetMonsters(pair);
          }
        } 
        
      }
    }
  }
  // return [structuredClone(pair), battleSteps]; //wait why was this cloned?
  return [pair, battleSteps];
}

//after death abilities
function checkDeathAbilities(pair, timing, battleSteps, deadMonsters){
  let party1 = pair[0].battleParty;
  let party2 = pair[1].battleParty;

  let sortedMonsters = getActingMonsters(timing, deadMonsters, []);

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
            let pairAtThisStage = structuredClone(pair);
            battleSteps.push({pair: pairAtThisStage, action: "ability", monster: skelly});
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
          let pairAtThisStage = structuredClone(pair);
          battleSteps.push({pair: pairAtThisStage, action: "ability", monster: monster});
          let numInfected = monster.level;
          for (let i = 0; i < otherParty.length; i++){
            if (otherParty[i].isDead) {
              continue;
            } else {
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

          let pairAtThisStage = structuredClone(pair);
          battleSteps.push({pair: pairAtThisStage, action: "ability", monster: monster});
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
          let pairAtThisStage = structuredClone(pair);
          battleSteps.push({pair: pairAtThisStage, action: "ability", monster: monster});
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
            let damagedPair = structuredClone(pair);
            battleSteps.push({pair: damagedPair, action: "damage"});
            pair = resetMonsters(pair); //TODO check if this is okay time to do this
          }
      
        }
      }
    }
  }

  if (deadMonsters2.length > 0){
    ([pair, battleSteps] = checkDeathAbilities(pair, "after death", battleSteps, deadMonsters2));

    //TODO code smell, this shouldn't be necessary...
    party1 = pair[0].battleParty;
    party2 = pair[1].battleParty;
  }

  //this isnt' working -- all bunched up at end, eliminating for now TODO
  // if (needsMove){
  //   let postDeathParties = structuredClone(parties);
  //   battleSteps.push({parties: postDeathParties, action: "move"}); //going to have to hide first index...  
  //   //move animation will be off if jumping more than one slot or death in middle... TODO
  // }
  
  //fine b/c only happening once, no matter how many death abilities? uhh no?
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

  return [pair, battleSteps];
}

//send waiting or ready for multiplayer lobby
function checkLobbyForReady(player){
  let lobby = lobbies[player.lobbyName];
  // lobby.players.push(player); //does this on ready
  // let lobbyPlayers = structuredClone(lobby.players);
  if (lobby.players.length < lobby.numPlayers) {
    // io.to(lobbyName).emit("waitingForBattle");
    io.to(player.id).emit("waitingForBattle");
  } else {
    //run the party trim functions
    for (let p of lobby.players) {
      p.battleParty = prepParty(p.battleParty);
    }

    //need to split lobby evenly, with extra battle if odd num
    //determine enemies for this round
    let battlePairs = []; //storing the unique battles (no duplicates)
    // let battleAssignments = []; //storing who is in the battles
    // console.log("lobby parties");
    // console.log(lobbyParties);
    if (lobby.players.length % 2 == 0) {
      for (let [i, p] of lobby.players.entries()) { //hmm
        let p1 = structuredClone(lobby.players[i]);
        lobby.players.splice(i, 1);
        let opponentIndex = Math.floor(Math.random() * lobby.players.length);
        let p2 = structuredClone(lobby.players[opponentIndex]);
        battlePairs.push([p1, p2, [p1.id, p2.id]]); //TODO could just send p1 p2 but need to refactor battlesteps
        // battlePairs.push([p2, p1]); //okay going to dupe so that its only sending to first client for loss/win
        lobby.players.splice(opponentIndex, 1);
        console.log(battlePairs);
      }
    } else { //odd -- need to figure out how to only count for one battle in HP tally... guess it makes sense to kind of do it client side? easy to do trophies then too...
      //take someone at random out and have them fight someone random from remaining
      let rIndex = Math.floor(Math.random() * lobby.players.length);
      let r1 = structuredClone(lobby.players[rIndex]);
      lobby.players.splice(rIndex, 1);
      let r2 = structuredClone(lobby.players[Math.floor(Math.random() * lobby.players.length)]);
      battlePairs.push([r1, r2, [r1.id]]);
      console.log(battlePairs);
      for (let [i, player] of lobby.players.entries()) { //hmm not right use-case
        let p1 = structuredClone(lobby.players[i]);
        lobby.players.splice(i, 1);
        let opponentIndex = Math.floor(Math.random() * lobby.players.length);
        let p2 = structuredClone(lobby.players[opponentIndex]);
        battlePairs.push([p1, p2, [p1.id, p2.id]]);
        // battlePairs.push([p2, p1]);
        lobby.players.splice(opponentIndex, 1);
        console.log(battlePairs);
      }
    }
    
    //run the battlesteps for each pair and send results to each client
    let sendToPairs = [];
    let numLost = 0;
    for (let pair of battlePairs){
      let [steps, lost] = getBattleSteps(pair); //TODO might be too big?
      numLost += lost;
      let startPair = structuredClone(pair); //unnecessary but w/e TODO
      sendToPairs.push([pair[2], startPair, steps]);
    }
    if (numLost > 0){
      lobbies[player.lobbyName].numPlayers -= numLost;
    }
    for (let battle of sendToPairs){
      for (let client of battle[0]){
        io.to(client).emit("startBattle", {startPair: battle[1], battleSteps: battle[2], numPlayersInLobby: lobbies[player.lobbyName].numPlayers});
      }
      // io.to(pair[0].id).emit("startBattle", {startPair: startPair, battleSteps: getBattleSteps(pair)});
    }

    //reset lobby.players so readyup works
    lobby.players = [];
    console.log("round over, num lost: " + numLost);

  }
}

//trims the party arrays to only include monsters and shift them to the front
function prepParty(preParty) {
  let party = structuredClone(preParty);
  for(let i = 0; i < party.length; i++){
    if (party[i] == null){
      for (let j = i; j < party.length - 1; j++){
        party[j] = party[j+1];
        if (j == party.length - 2 && party[j+1] !== null){
          party[j+1] = null;
        }
      }
    }
  }
  for (let i = party.length - 1; i >= 0; i--){
    if (party[i] == null){
      party.splice(i, 1);
    }
  }
  //reset indexes
  for (let i = 0; i < party.length; i++){
    party[i].index = i;
    // party[i].lichID = player.id;
  }
  return party;
}

//checks timing and sorts monsters by strength for ability triggers
function getActingMonsters(timing, party1, party2){
  //check for abilities that match the timing and make new array of monsters that need to act
  let actingMonsters = [];
  let maxPower = 0;
  
  if (timing == "before attack" || timing == "after attack"){
    if (party1[0].timing == timing){
      if (party1[0].currentPower > maxPower){
        maxPower = party1[0].currentPower;
      }
      actingMonsters.push(party1[0]);
    }
    if (party2[0].timing == timing){
      if (party2[0].currentPower > maxPower){
        maxPower = party2[0].currentPower;
      }
      actingMonsters.push(party2[0]);
    }
  } else {
    for (let m of party1){
      if (m.timing == timing){
        if (m.currentPower > maxPower){
          maxPower = m.currentPower;
        }
        actingMonsters.push(m);
      }
    }
  
    if (party2.length != 0){ //hack for deadmonsters sorting
      for (let m of party2) {
        if (m.timing == timing){ //wasn't doing this before refactor.... wtf?
          if (m.currentPower > maxPower){
            maxPower = m.currentPower;
          }
          actingMonsters.push(m);
        }
      }
    }
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
  return sortedMonsters;
}

//hmm TODO resets monster properties that should refresh after certain steps...
function resetMonsters(pair){
  for (let monster of pair[0].battleParty){
    monster.isDamaged = false;
  }
  for (let monster of pair[1].battleParty){
    monster.isDamaged = false;
  }
  return pair;
}

//for sending client new hire options, taking frozen into account
function refreshHires(tier, hires, playerID){
  for (let i = 0; i < hires.length; i++){
    if (hires[i] == null || !hires[i].isFrozen) {
      //select randomly from all unlocked tiers
      let randomTier = Math.floor(Math.random()*tier); //monster array starts at 0 for tier 1, should be fine
      let RandomMonster = monsters[randomTier][Math.floor(Math.random()*monsters[randomTier].length)];
      hires[i] = new RandomMonster({index: i, lichID: playerID});
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
