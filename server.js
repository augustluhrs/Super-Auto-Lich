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
let battleStepTime = 1000; //interval it takes each battle step to take -- TODO, client speed (array of events?)

//just for testing
// let player1;
// let party1 = [];
// let party2 = [];
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
  players.push({id: socket.id, gold: 10, hp: 10, turn: 1, party: [null, null, null, null, null]});
  console.log(players);

  //send starting data
  socket.emit('goToMarket', {gold: 10, hp: 10, turn: 1, party: [null, null, null, null, null], hires: refreshHires(3)});

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
    console.log(JSON.stringify(players));
    for (let player of players) {
      if (player.id == socket.id){
        player.ready = true;
        player.party = data.party;
        player.battleParty = data.party; //to hold the party that gets changed in battle

        if (player.lobby == undefined){ //join a lobby if not in one already
          player.lobby = testLobby;
          socket.join(player.lobby);
          // console.log(io.sockets.adapter.rooms.get(player.lobby)); //map
        }
        //TODO server check both and send to battle
        let lobby = io.sockets.adapter.rooms.get(player.lobby);
        console.log(lobby);
        if (lobby.size == 2){ //size instead of length because its a set
          let enemyIsReady = false;
          let enemy = {};
          for (let id of lobby){
            console.log(id);
            if (id !== player.id) { //check to see if other player is ready
              for (let other of players) {
                console.log(other.ready);
                if (other.id == id && other.ready == true){
                  enemy.id = other.id;
                  enemy.party = other.battleParty;
                  enemyIsReady = true;
                  // io.to(player.lobby).emit("startBattle", [{id: player.id, party: player.party}, {id: other.id, party: other.party}]);
                } 
              }
            }
          }
          //TODO make less clunky...
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
            for (let i = party1.length - 1; i > 0; i--){
              if (party1[i] == null){
                party1.splice(i, 1);
              }
            }
            // for (let [i, slot] of party1.entries()){
            //   if (slot == null){
            //     party1.splice(i, 1);
            //   }
            // }
            let party2 = enemy.party;
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
            for (let i = party2.length - 1; i > 0; i--){
              if (party2[i] == null){
                party2.splice(i, 1);
              }
            }
            console.log("party 1");
            console.log(party1);
            console.log("party 2");
            console.log(party2);

            let battle = [{id: player.id, party: party1}, {id: enemy.id, party: party2}];
            io.to(player.lobby).emit("startBattle", battle);
            //start battle sequence
            setTimeout(() => {
              battleStep(battle, player.lobby);
            }, battleStepTime);
          } else {
            socket.emit("waitingForBattle");
          }
        } else {
          socket.emit("waitingForBattle");
        }
      }
    }
  });

  //each step of the battle -- triggered from client for testing
  // socket.on('battleStep', () => {
  //   console.log("battleStep");
  //   //apply damage
  //   party1[0].currentHP -= party2[0].power;
  //   party2[0].currentHP -= party1[0].power;

  //   //check for death and move up party if so
  //   if (party1[0].currentHP <= 0){
  //     party1.splice(0, 1);
  //     for (let i = 0; i < party1.length; i++){
  //       party1[i].slot.x = player1.slots[i];
  //     }
  //   }
  //   if (party2[0].currentHP <= 0){
  //     party2.splice(0, 1);
  //     for (let i = 0; i < party2.length; i++){
  //       party2[i].slot.x = player1.slots[i];
  //     }
  //   }

  //   //check for end, send next step or end event
  //   if (party1.length == 0 && party2.length == 0){
  //     //TODO server send both back and unReady

  //     socket.emit("battleOver", {party: party1, enemyParty: party2, result: "tie"})
  //   } else if (party1.length == 0){
  //     //TODO server send both back and unReady

  //     let hp;
  //     //reduce HP here so they can see it on the loss screen;
  //     for (let player of players) {
  //       if (player.id == socket.id) {
  //         player.hp -= 2;
  //         hp = player.hp;
  //         return;
  //       }
  //     }
  //     socket.emit("battleOver", {party: party1, enemyParty: party2, hp: hp, result: "loss"})
  //   } else if (party2.length == 0){
  //     //TODO server send both back and unReady
  //     socket.emit("battleOver", {party: party1, enemyParty: party2, result: "win"})
  //   } else {
  //     socket.emit("battleAftermath", {party: party1, enemyParty: party2});
  //   }
  // });

  //after battle timeout, send back to market
  socket.on("goToMarket", () => {
    for (let player of players) {
      if (player.id == socket.id){
        player.gold = 10;
        player.turns++;
        player.ready = false;
        socket.emit("goToMarket", {gold: player.gold, turns: player.turns, party: player.party, hires: refreshHires()});
      }
    }
  });

  //listen for this client to disconnect
  socket.on('disconnect', () => {
    console.log('input client disconnected: ' + socket.id);
    for (let [i, player] of players.entries()) {
      if (player.id == socket.id){
        players.splice(i, 1);
      }
    }
  });
  
});

//
// FUNCTIONS
//

// function backToMarket(id){
//   for (let player of players) {
//     if (player.id == id){
//       player.gold = 10;
//       player.turns++;
//       socket.emit("goToMarket", {gold: player.gold, turns: player.turns, hires: refreshHires()})
//       return;
//     }
//   }
// }

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
    // while (party1[0] == null){
    //   party1.splice(0, 1);
    // }
  }
  if (party2[0].currentHP <= 0){
    party2.splice(0, 1);
    // while (party2[0] == null){
    //   party2.splice(0, 1);
    // }
  }

  battle[0].party = party1;
  battle[1].party = party2;

  //check for end, send next step or end event
  if (party1.length == 0 && party2.length == 0) {
    //send both tie
    io.to(lobby).emit("battleOver", {battle: battle, result: "tie"})
  } else if (party1.length == 0){
    //player1 loss
    for (let player of players) {
      if (player.id == battle[0].id){
        player.hp -= 2;
        io.to(player.id).emit("battleOver", {battle: battle, hp: player.hp, result: "loss"})
      } else if (player.id == battle[1].id){
        io.to(player.id).emit("battleOver", {battle: battle, result: "win"})
      }
    }
  } else if (party2.length == 0){
    //player2 loss
    for (let player of players) {
      if (player.id == battle[1].id){
        player.hp -= 2;
        io.to(player.id).emit("battleOver", {battle: battle, hp: player.hp, result: "loss"})
      } else if (player.id == battle[0].id){
        io.to(player.id).emit("battleOver", {battle: battle, result: "win"})
      }
    }
  } else {
    //send both next step and trigger next step
    io.to(lobby).emit("battleAftermath", battle);
    setTimeout(() => {
      battleStep(battle, lobby);
    }, battleStepTime);
  }
}

function refreshHires(availableHireNum){
  let hires = [];
  for (let i = 0; i < availableHireNum; i++){
    let RandomMonster = monsters[Math.floor(Math.random()*monsters.length)];
    hires.push(new RandomMonster({index: i}));
  }
  return hires;
}

// function randomParty(player){
//   let party = [];
//   for (let i = 0; i < 5; i++){
//     let RandomMonster = monsters[Math.floor(Math.random()*monsters.length)];
//     party.push(new RandomMonster({index: i}));
//     // party.push(new RandomMonster({index: i, slot: {x: player.slots[i], y: player.slotY}}));
//   }
//   return party;
// }