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

let party1 = [];
let party2 = [];

//clients
var inputs = io.of('/')
//listen for anyone connecting to default namespace
inputs.on('connection', function(socket){
  console.log('new input client!: ' + socket.id);
  
  //send starting data
  socket.emit('setup', {gold: 10, hp: 10, turn: 1});

  //on changes to party (in market or battle) -- eventually need this to happen on server
  socket.on('partyUpdate', function(data){
    console.log(socket.id + "'s party updated");
    party1 = data.party1;
    party2 = data.party2;
  });

  //each step of the battle
  socket.on('battleStep', function(){
    console.log("battleStep");
  });

  //listen for this client to disconnect
  socket.on('disconnect', function(){
    console.log('input client disconnected: ' + socket.id);
  });
  
});