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

//clients
var inputs = io.of('/')
//listen for anyone connecting to default namespace
inputs.on('connection', function(socket){
  console.log('new input client!: ' + socket.id);
  
  //new event listeners
  
  //listen for this client to disconnect
  socket.on('disconnect', function(){
    console.log('input client disconnected: ' + socket.id);
  });
  
});