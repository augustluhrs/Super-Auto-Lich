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
// const Monster = require("./modules/monster");
const Monster = require("./modules/monsters").Monster;
const monsters = require("./modules/monsters").monsters;
// let party1 = [];
// let party2 = [];
let players = [];

//clients
var inputs = io.of('/')
//listen for anyone connecting to default namespace
inputs.on('connection', (socket) => {
  console.log('new input client!: ' + socket.id);

  //add entry to players array
  players.push({id: socket.id, gold: 10, hp: 10, turn: 1});

  //send starting data
  socket.emit('setup', {gold: 10, hp: 10, turn: 1});

  //get client x,y data for use in making monsters
  socket.on("clientCoords", (data) => {
    for (let player of players){
      if (player.id == socket.id) {
        player.slots = data.slots;
        player.slotY = data.slotY;
        let party1 = randomParty(player);
        let party2 = randomParty(player);
        // console.log(JSON.stringify(party1[1].show));
        socket.emit("initParty", {party: party1, enemyParty: party2});
        // console.log("sent player these parties");
        // console.log(party1, party2);

        return;
      }
    }
  });

  //on changes to party (in market or battle) -- eventually need this to happen on server
  // socket.on('partyUpdate', function(data){
  //   console.log(socket.id + "'s party updated");
  //   party1 = data.party1;
  //   // party2 = data.party2;
  // });

  //each step of the battle
  socket.on('battleStep', () => {
    console.log("battleStep");
  });

  //listen for this client to disconnect
  socket.on('disconnect', () => {
    console.log('input client disconnected: ' + socket.id);
  });
  
});

function randomParty(player){
  let party = [];
  for (let i = 0; i < 5; i++){
    let m = monsters[Math.floor(Math.random()*monsters.length)];
    party.push(new m({index: i, slot: {x: player.slots[i], y: player.slotY}}));
    // party.push(new Monster({index: i, slot: {x: player.slots[i], y: player.slotY}}));
  }
  return party;
}