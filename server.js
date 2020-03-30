
// Dependencies
// =============================================================
	var express = require("express");
	var bodyParser = require("body-parser");
	var path = require("path");
// =============================================================

// Database Setup
// =============================================================
	// var mysql = require('mysql');

	// var con = mysql.createConnection({
	//   host: "localhost",
	//   user: "root",
	//   password: ,
	//   database: "address_data"
	// });

// =============================================================

// Express App Setup and Index Path
// =============================================================

	var app = express();
	var PORT = 3000;

	var http = require('http').createServer(app);
	var io = require('socket.io')(http);	

	// Sets up the Express app to handle data parsing
	app.use(bodyParser.json({limit: '50mb'}));
	app.use(bodyParser.text());
	app.use(bodyParser.urlencoded({limit: '50mb', extended: true, parameterLimit: 1000000}));

	app.use(express.static(__dirname + '/'));

	app.get('/', function(req, res){
		res.sendFile(path.join(__dirname + '/homepage.html'));
	});

// =============================================================

// Routes
// =============================================================

	var playerData = [];
	var playerStatus = {
		p1here: false,
		p2here: false
	};

	app.get('/get-player-data', function(req, res){
		res.send(playerData);
	});	

	io.on('connection', function(socket){
		socket.on('create-room', function(data) {

			socket.join(data.room);

			if(io.sockets.adapter.rooms[data.room].length <= 1){
				console.log('nobody in room');
				playerData.push({'name': data.name, 'deck': data.deck, "id": 0, ready: false});
				io.to(data.room).emit('waiting', playerData[0].id);
			} else {
				playerData.push({'name': data.name, 'deck': data.deck, "id": 1, ready: false});
				console.log('room is active');
				socket.emit('player-id', 1);
				io.to(data.room).emit('setup');
			}
			//socket.join(room);
		});

		socket.on('ready', function(data) {
			console.log(data.id);
			playerData[data.id].ready = true;

			if(playerData[0].ready == true && playerData[1].ready == true){
				var choice = Math.floor((Math.random() * 2));
				io.emit('starting', {choice: choice, type: 'new-game'});
			} else {
				socket.emit('ingame-waiting');
			}

		});

		socket.on('rejoin', function(data){
			console.log(data)
			socket.join(data);
		});

		socket.on('end-turn', function(data){
			if(data.pass){

			} else {
				console.log('sending: '+data.card.img);
			}
			//socket.to('gwentroom').emit('opp-player-turn', data.card);
			socket.broadcast.emit('opp-player-turn', data);
			//io.emit('opp-player-turn', data.card);

		});

		socket.on('round-over', function(data){
			socket.broadcast.emit('finish-round', data);
		});

		socket.on('check-winner', function(data){
			console.log(data)
			//check if scores match
			if(data.p1.p1 == data.p2.p2 && data.p1.p2 == data.p2.p1){

				var p1Id;
				var p2Id;

				for (var i = 0; i < playerData.length; i++) {
					if(playerData[i].name == data.p1.name){
						p1Id = playerData[i].id;
						var p1fScore = data.p1.p2;
					} else if(playerData[i].name == data.p2.name){
						p2Id = playerData[i].id;
						var p2fScore = data.p2.p2;
					};					
				};

				console.log('id: '+p1Id+' name: '+playerData[p1Id].name+' score: '+p1fScore);
				console.log('id: '+p2Id+' name: '+playerData[p2Id].name+' score: '+p2fScore);

 				if(p1fScore == p2fScore) {
					io.emit('round-results', {draw: true});
				} else {
					if(p1fScore > p2fScore){
						io.emit('round-results', {player: p1Id, name: playerData[p1Id].name, draw: false});
					} else {
						io.emit('round-results', {player: p2Id, name: playerData[p2Id].name, draw: false});
					};
				};

			} else {
				console.log('ERROR!!!');
			};
		});			

		socket.on('new-round', function(data){
			io.emit('starting', {type: data.type});
		});

		socket.on('rematch-rdy', function(data){
			socket.broadcast.emit('opp-rematch-rdy', {});
		});

		socket.on('start-rematch', function(data){
			for (var i = 0; i < playerData.length; i++) {
				playerData[i].ready = false;
			};
			io.emit('starting-rematch', {});
		});


		//Disconnection check
		socket.on('start-dc-check', function(data) {

			setInterval(function() {

				io.sockets.emit('dc-check', {});

				setTimeout(function(){

					if(playerStatus.p1here == false || playerStatus.p2here == false){
						io.sockets.emit('user-dc', {});
						socket.disconnect();
					};

					//resets to false for dc check
					playerStatus.p1here = false;
					playerStatus.p2here = false;		

				}, 3000);

			}, 13000);	

		});

		socket.on('dc-validate', function(data) {

			if(data.player == 0){
				playerStatus.p1here = true;
			};
			if(data.player == 1){
				playerStatus.p2here = true;
			};

		});		

	}); 



// =============================================================




// =============================================================


	// Starts the server
// =============================================================
	http.listen(process.env.PORT || 3000, function(){
		console.log("Express server running on port %d in %s mode", this.address().port, app.settings.env);

	});
// =============================================================