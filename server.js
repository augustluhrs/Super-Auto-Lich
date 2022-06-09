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

const Monster = require("./modules/monsters").Monster;
const monsters = require("./modules/monsters").monsters;
let players = []; // holds all current players, their parties, their stats, etc.

//just for testing
let player1;
let party1 = [];
let party2 = [];
let testLobby = "testLobby";

//
// SERVER EVENTS
//

//clients
var inputs = io.of('/')
//listen for anyone connecting to default namespace
inputs.on('connection', (socket) => {
  console.log('new input client!: ' + socket.id);

  //add entry to players array
  players.push({id: socket.id, gold: 10, hp: 10, turn: 1});

  //send starting data
  socket.emit('setup', {gold: 10, hp: 10, turn: 1, hires: refreshHires(3)});

  //if gold left, replaces hires with random hires
  socket.on("refreshHires", (data) => {
    for (let player of players) {
      if (player.id == socket.id){
        if (player.gold > 0){
          //get random monsters and send them to player's market
          //TODO: allow for frozen hires
          player.gold--;
          socket.emit("newHires", {gold: player.gold, hires: refreshHires(data.availableHireNum)});
          console.log("sent " + socket.id + "new hires");
          return;
        } else {
          console.log('not enough gold');
        }
      }
    }
  });

  //when player hires a monster
  socket.on("hireMonster", (data) => {
    for (let player of players) {
      if (player.id == socket.id){
        player.party = data.party;
        player.gold -= 3;
        console.log(player.id + "has " + player.gold + " left");
        socket.emit("updateGold", {gold: player.gold});
      }
    }
  });

  //on end turn from market, signals to server we're ready to battle
  //for test, just going to put in room on here instead of joining lobby at start, TODO
  socket.on("readyUp", (data) => {
    for (let player of players) {
      if (player.id == socket.id){
        player.ready = true;
        player.party = party;
        if (player.lobby == undefined){
          player.lobby = testLobby;
          socket.join(player.lobby);
          console.log(socket.rooms);
        }
        //TODO server check both and send to battle
        socket.emit("waitingForBattle");
        //else io.room.emit("startBattle");
      }
    }
  });

  //each step of the battle
  socket.on('battleStep', () => {
    console.log("battleStep");
    //apply damage
    party1[0].currentHP -= party2[0].power;
    party2[0].currentHP -= party1[0].power;

    //check for death and move up party if so
    if (party1[0].currentHP <= 0){
      party1.splice(0, 1);
      for (let i = 0; i < party1.length; i++){
        party1[i].slot.x = player1.slots[i];
      }
    }
    if (party2[0].currentHP <= 0){
      party2.splice(0, 1);
      for (let i = 0; i < party2.length; i++){
        party2[i].slot.x = player1.slots[i];
      }
    }

    //check for end, send next step or end event
    if (party1.length == 0 && party2.length == 0){
      //TODO server send both back and unReady

      socket.emit("battleOver", {party: party1, enemyParty: party2, result: "tie"})
    } else if (party1.length == 0){
      //TODO server send both back and unReady

      let hp;
      //reduce HP here so they can see it on the loss screen;
      for (let player of players) {
        if (player.id == socket.id) {
          player.hp -= 2;
          hp = player.hp;
          return;
        }
      }
      socket.emit("battleOver", {party: party1, enemyParty: party2, hp: hp, result: "loss"})
    } else if (party2.length == 0){
      //TODO server send both back and unReady

      socket.emit("battleOver", {party: party1, enemyParty: party2, result: "win"})
    } else {
      socket.emit("battleAftermath", {party: party1, enemyParty: party2});
    }
  });

  //listen for this client to disconnect
  socket.on('disconnect', () => {
    console.log('input client disconnected: ' + socket.id);
    players = [];
  });
  
});

//
// FUNCTIONS
//

function backToMarket(id){
  let gold, turns;
  for (let player of players) {
    if (player.id == id){
      player.gold = 10;
      player.turns++;
      gold = player.gold;
      turns = player.turns;
      return;
    }
  }
  socket.emit("backToMarket", {gold: gold, turns: turns, hires: refreshHires()})
}

function refreshHires(availableHireNum){
  let hires = [];
  for (let i = 0; i < availableHireNum; i++){
    let RandomMonster = monsters[Math.floor(Math.random()*monsters.length)];
    hires.push(new RandomMonster({index: i}));
  }
  return hires;
}

function randomParty(player){
  let party = [];
  for (let i = 0; i < 5; i++){
    let RandomMonster = monsters[Math.floor(Math.random()*monsters.length)];
    party.push(new RandomMonster({index: i}));
    // party.push(new RandomMonster({index: i, slot: {x: player.slots[i], y: player.slotY}}));
  }
  return party;
}