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
let players = {}; // holds all current players, their parties, their stats, etc.
let battleStepTime = 1000; //interval it takes each battle step to take -- TODO, client speed (array of events?)

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
  // players.push(new Player({id: socket.id, hires: refreshHires(1, [null, null, null])}));
  // players.push({id: socket.id, gold: 10, hp: 10, turn: 1, hires: [null, null, null], hireNum: 3, party: [null, null, null, null, null]});
  // console.log(players);

  //send starting data
  socket.emit('goToMarket', players[socket.id]);
  socket.join(players[socket.id].lobby); //TODO placeholder just for testing

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
    player.battleParty = []; //i still don't understand references...
    for (let i = 0; i < data.party.length; i++){
      if (data.party[i] == null){
        player.battleParty[i] = null;
      } else {
        player.battleParty[i] = new Monster(data.party[i]);
      }
    }

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
        //reset indexes
        for (let i = 0; i < party1.length; i++){
          party1[i].index = i;
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
        //reset indexes
        for (let i = 0; i < party2.length; i++){
          party2[i].index = i;
        }

        //reset here since we only check when starting battle
        players[player.id].ready = false;
        players[enemy.id].ready = false;

        //start battle sequence
        let battle = [{id: player.id, party: party1}, {id: enemy.id, party: party2}];
        io.to(player.lobby).emit("startBattle", battle);
        setTimeout(() => {
          battleStep(battle, player.lobby);
        }, battleStepTime);
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

function battleStep(battle, lobby){
  console.log("battleStep");
  let party1 = battle[0].party;
  let party2 = battle[1].party;

  //check for null

  //apply damage
  party1[0].currentHP -= party2[0].power;
  party2[0].currentHP -= party1[0].power;

  //check for death and move up party if so
  if (party1[0].currentHP <= 0){
    party1.splice(0, 1);
    //reset indexes
    for (let i = 0; i < party1.length; i++){
      party1[i].index = i;
    }
  }
  if (party2[0].currentHP <= 0){
    party2.splice(0, 1);
    //reset indexes
    for (let i = 0; i < party2.length; i++){
      party2[i].index = i;
    }
  }

  battle[0].party = party1;
  battle[1].party = party2;
  let p1 = players[battle[0].id];
  let p2 = players[battle[1].id];

  //check for end, send next step or end event
  if (party1.length == 0 && party2.length == 0) {
    //send both tie
    io.to(lobby).emit("battleOver", {battle: battle, result: "tie"})
  } else if (party1.length == 0){ //player1 loss
    p1.hp -= p1.hpLoss;
    if (p1.hp <= 0) {
      // gameOver(p1, lobby);
      io.to(p1.id).emit("gameOver", {result: "loss"});
      io.to(p2.id).emit("gameOver", {result: "win"});
      return;
    } else {
      io.to(p1.id).emit("battleOver", {battle: battle, hp: p1.hp, result: "loss"})
    }
    io.to(p2.id).emit("battleOver", {battle: battle, result: "win"})
  } else if (party2.length == 0){ //player2 loss
    p2.hp -= p2.hpLoss;
    if (p2.hp <= 0) {
      // gameOver(p2, lobby);
      io.to(p1.id).emit("gameOver", {result: "win"});
      io.to(p2.id).emit("gameOver", {result: "loss"});
      return;
    } else {
      io.to(p2.id).emit("battleOver", {battle: battle, hp: p2.hp, result: "loss"});
    }
    io.to(p1.id).emit("battleOver", {battle: battle, result: "win"})
  } else {
    //send both next step and trigger next step
    io.to(lobby).emit("battleAftermath", battle);
    setTimeout(() => {
      battleStep(battle, lobby);
    }, battleStepTime);
  }
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

// function gameOver(player, lobby, result){
//   io.to(player.id).emit("gameOver", {result: result});
// }
