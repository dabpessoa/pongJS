var canvas = document.getElementById('myCanvas');
var context = canvas.getContext('2d');
var collideSound = document.getElementById('collideSoundId');

var websocketControl = {
	wsUri: "ws://echo.websocket.org",
	protocols: ["com.kaazing.echo", "example.imaginary.protocol"],
	websocket: undefined,
	isConnected: function() {
		if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
			return true;
		} return false;
	},
	initWebSocket: function(wsUri, protocols) {

		if (!this.isConnected()) {
			if (!wsUri) {
				var p = protocols ? protocols : this.protocols;	
			}
			var u = wsUri ? wsUri : this.wsUri;

			if (p) {
				this.websocket = new WebSocket(u, p);
			} else {
				this.websocket = new WebSocket(u);
			}
			
			this.websocket.binaryType = 'blob';
			var control = this;
			this.websocket.onopen = function(event) { control.onOpen(event) }; 
			this.websocket.onclose = function(event) { control.onClose(event) }; 
			this.websocket.onmessage = function(event) { control.onMessage(event) }; 
			this.websocket.onerror = function(event) { control.onError(event) };

			document.querySelector("#webSocketConfig > input[type='button']").disabled = true;

		}
		
	},
	onOpen: function(event) {
		console.log('conexão aberta');
	},
	onMessage: function(event) {
		var data = event.data;

		if(typeof data === "string") {
			//console.log("String message received", event, data);
			if (data == "start") {
				if (!game.isRunning()) {
					addPlayer();
					game.start();
				} else {
					game.restart();
				}
			} else if (data == "stop") {
				console.log("player remoto parou o jogo.");
				if (game.isRunning()) {
					game.stop();
				}
			} else if(data == "gameOver") {
				console.log("player remoto enviou evento de gameover.");
				if (game.isRunning()) {
					game.stop();
				}
				if (!gameManager.gameOvered) {
					gameManager.showGameOver();	
				}
			} else if (data == "continue") {
				if (!game.isRunning()) {
					game.continue();
				}
			} else {

				var objetos = data.split("|");
				var playerRemoto = JSON.parse(objetos[0]);
				var ballsRemoto = JSON.parse(objetos[1]);

				if (paddles[0].LEFT && playerRemoto.paddle.LEFT) {
					paddles[0].y = playerRemoto.paddle.y;
				} else {
					paddles[1].y = playerRemoto.paddle.y;
				}
				//paddles[1].y = playerRemoto.paddle.y;
				
				// Só funciona para uma única bola.
				if (balls && balls.length > 0 && ballsRemoto && ballsRemoto.length > 0) {
					balls[0].centerX = ballsRemoto[0].centerX;
					balls[0].centerY = ballsRemoto[0].centerY;	
				}

			}
			
			
		} else if(data instanceof Blob) {
			console.log("Blob message received", data);
			var blob = new Blob(data);
		} else if(data instanceof ArrayBuffer) {
			console.log("ArrayBuffer Message Received", + data);
			var a = new Uint8Array(data);
		} else {
			console.log('Tipo de mensagem recebida não reconhecida: '+data);
		}
	},
	onError: function(event) {
		console.log('error');
	},
	onClose: function(event) {
		console.log('close');
	},
	sendMessage: function(data) {
		if (this.websocket.readyState === WebSocket.OPEN) {
			// The socket is open, so it is ok to send the data.
			this.websocket.send(data);
		} else {
			console.log('Conexão WebSocket fechada! Não foi possível enviar a mensagem: '+data);
		}
	}
}

function connectToWebSocketServer() {
				
	var wsUri = document.querySelector("#webSocketConfig > input[type='text']").value;	

	// Inicializar conexão websocket
	websocketControl.initWebSocket("ws://"+wsUri);				 

}

function addPlayer() {

	players = [];

	//var playerName = document.querySelector("#playerNameFieldId").value;
	var side = document.querySelector("[name='myside'][value='LEFT']").checked ? "left" : "right";
	var otherSide = document.querySelector("[name='myside'][value='LEFT']").checked ? "right" : "left";

	// add principal player.
	players.push(new Player("Player1", side, false));	

	// add other player.
	players.push(new Player("Player2", otherSide, true));


	gameManager.clearCanvas();
	changeCanvasSize();
	gameManager.init();
	game.draw();

}

function atualizarDimensoesTexto(w, h) {

	var widthElement = document.querySelector('#windowSize #w');
	var heightElement = document.querySelector('#windowSize #h');

	widthElement.innerHTML = w;
	heightElement.innerHTML = h;

}

function changeCanvasSize() {
	var x = window.innerWidth || window.document.documentElement.clientWidth || window.document.body.clientWidth;
	var y = window.innerHeight|| window.document.documentElement.clientHeight|| window.document.body.clientHeight;

	canvas.width = x - 40;
	canvas.height = y - 170;

	atualizarDimensoesTexto(canvas.width, canvas.height);

}

window.onload = function() {
	changeCanvasSize();
	gameManager.init();
	game.draw();
}

window.onresize = function() {
	changeCanvasSize();
	gameManager.init();
	game.draw();			
}

function Player(name, position, remoto) {
	 this.name = name;
	 this.remoto = remoto;
	 this.paddle = new Paddle(position);
}
//var player = new Player();

// Function for creating balls
function Ball() {
	this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.vx = 300;
    this.vy = 150;
    this.radius = 6;
    this.lineWidth = undefined;
    this.bouncing = false;
    this.fillStyle = 'white';
    this.strokeStyle = undefined;
    this.shadow = {
    	color: '#000',
    	blur: 20,
    	offSetX: 10,
    	offSetY: 10
    };
    this.draw = function() {
	
		context.beginPath();
		// Starting angle = 0; Ending angle = 2 * PI
		context.arc(this.centerX, this.centerY, this.radius, 0, 2 * Math.PI, false);
		
		if (this.fillStyle) {
			context.fillStyle = this.fillStyle;
		}

		if (this.shadow) {
			context.shadowColor = this.shadow.color;
			context.shadowBlur = this.shadow.blur;
			context.shadowOffsetX = this.shadow.offSetX;
			context.shadowOffsetY = this.shadow.offSetY;
		}

		if (this.fillStyle || this.shadow) {
			context.fill();	
		}

		if (this.lineWidth && this.lineWidth > 0) {
			context.lineWidth = this.lineWidth;
			if (this.strokeStyle) {
				context.strokeStyle = this.strokeStyle;	
			}
			context.stroke();
		}
		
	}
}

// Function for creating paddles
function Paddle(position) {
	this.LEFT = (position == "left");
	this.RIGHT = (position == "right");

	// Height and width
	this.height = 150;
	this.width = 5;
	
	// Paddle's position
	this.x = this.LEFT ? 0 : (canvas.width - this.width);
	this.y = (canvas.height/2) - (this.height/2);

	this.draw = function() {
		context.fillStyle = 'white';
		context.fillRect(this.x, this.y, this.width, this.height);
	}
}


var balls = [];
var paddles = [];
var players = [];

var game = {
	gameFrameVariable: undefined,
	running: false,
	start: function() {
		if (!websocketControl.isConnected()) {
			connectToWebSocketServer();	
		}

		if (this.running) {
			this.stopGameLoop();
		}
		gameManager.init();
		this.running = true;
		if (!this.gameFrameVariable) {
			this.startGameLoop((new Date()).getTime());
		}
		websocketControl.sendMessage("start");
	},
	restart: function() {
		gameManager.init();
	},
	stop: function() {
		this.stopGameLoop();
		this.running = false;
		websocketControl.sendMessage("stop");
	},
	continue: function() {
		this.running = true;
		if (!this.gameFrameVariable) {
			this.startGameLoop((new Date()).getTime());	
		}
		websocketControl.sendMessage("continue");
	},
	startGameLoop: function(previousTime) {
		// function for running the whole animation
		var time = (new Date()).getTime() - previousTime;
		this.updateGame(time);
		if (this.running) {
			previousTime = (new Date()).getTime();
			var thisGame = this;
			this.gameFrameVariable = this.requestAnimFrame()(function() {
				thisGame.startGameLoop(previousTime);
			});
		}
	},
	stopGameLoop: function() {
		if (this.gameFrameVariable) {
			this.cancelRequestAnimFrame()(this.gameFrameVariable);	
		} this.gameFrameVariable = undefined;
	},
	updateGame: function(time) {
		gameManager.clearCanvas();
		this.draw();
		this.proccessLogics(time);
		//if (balls && balls.length > 0) {
		websocketControl.sendMessage(JSON.stringify(gameManager.player) +"|"+ JSON.stringify(balls));	
		//}
	},
	draw: function() {
		// draw everything on canvas

		gameManager.paintCanvas();

		// draw balls
		for(var i = 0; i < balls.length; i++) {
			balls[i].draw();
		}

		// draw paddles
		for(var i = 0; i < paddles.length; i++) {
			paddles[i].draw();
		}

	},
	proccessLogics: function(time) {

		// proccess balls logics
		for(var i = 0; i < balls.length; i++) {
			// make ball bounce
			gameManager.bounceBallLogic(balls[i], time);
		}

	},
	requestAnimFrame: function(callback) {
    	return window.requestAnimationFrame 		|| 
    		   window.webkitRequestAnimationFrame 	|| 
    		   window.mozRequestAnimationFrame 		|| 
    		   window.oRequestAnimationFrame 		|| 
    		   window.msRequestAnimationFrame 		||
        	   function(callback) {
        	   		window.setTimeout(callback, 1000 / 60);
        	   };
    },
    cancelRequestAnimFrame: function() {
		return window.cancelAnimationFrame          	||
			   window.webkitCancelRequestAnimationFrame ||
			   window.mozCancelRequestAnimationFrame    ||
			   window.oCancelRequestAnimationFrame     	||
			   window.msCancelRequestAnimationFrame     ||
			   window.clearTimeout();
	},
	fullScreen: function(element) {
		// full-screen available?
		if (document.fullscreenEnabled || 
		    document.webkitFullscreenEnabled || 
		    document.mozFullScreenEnabled ||
		    document.msFullscreenEnabled) {

			// go full-screen
			if (element.requestFullscreen) {
			    element.requestFullscreen();
			} else if (element.webkitRequestFullscreen) {
			    element.webkitRequestFullscreen();
			} else if (element.mozRequestFullScreen) {
			    element.mozRequestFullScreen();
			} else if (element.msRequestFullscreen) {
			    element.msRequestFullscreen();
			}

		}
	},
	isRunning: function() {
		return this.running;
	}
}

var gameManager = {
	player: undefined,
	ballsAmount: undefined,
	gameOvered: false,
	init: function() {

		this.gameOvered = false;

		canvas.addEventListener("keydown", this.keyMovePaddle, true);
		canvas.addEventListener("mousemove", this.mouseMovePaddle, true);

		balls = [];
		if (this.ballsAmount) {
			for(var i = 0 ; i < this.ballsAmount ; i++) {
				balls.push(new Ball());	
			}
		} else {
			balls.push(new Ball());	
		}

		paddles = [];
		if (!players || players.length == 0) {
			paddles.push(new Paddle("left"));
			paddles.push(new Paddle("right"));
		}
		for (var i = 0 ; i < players.length ; i++) {
			paddles.push(players[i].paddle);
			if (!players[i].remoto) {
				this.player = players[i];
			}
		}
		//paddles.push(new Paddle("left"));
		//paddles.push(new Paddle("right"));


		for (var i = 0 ; i < balls.length ; i++) {
			//balls[i].fillStyle = createRadialGradient();
			balls[i].vx += 10*i;
			balls[i].vy += 20*i;
			balls[i].bouncing = true;
		}

	},
	bounceBallLogic: function(Ball, time) {
		if (Ball.bouncing) {
			// pixels / second
			Ball.centerX += (time * Ball.vx) / 1000;
			Ball.centerY += (time * Ball.vy) / 1000;

			// check paddle collision
			for (var i = 0 ; i < paddles.length ; i++) {
				this.checkBallPaddleCollision(Ball, paddles[i]);
			}

			if (this.checkEdgeCollision(Ball)) {
				var index = balls.indexOf(Ball);
				balls.splice(index, 1);
				if (balls.length == 0) {
					game.stop();
					this.showGameOver();
				}
			}
		}
  	},
  	checkEdgeCollision: function(Ball) {
  		var deathCollision = false;
		if ((Ball.centerX - Ball.radius) <= 0) { //Lateral esquerda
			Ball.vx = -Ball.vx;
			Ball.centerX = 0 + Ball.radius;
			deathCollision = true;
		} else if ((Ball.centerX + Ball.radius) >= canvas.width) { //Lateral direita
			Ball.vx = -Ball.vx;
			Ball.centerX = canvas.width - Ball.radius;
			deathCollision = true;
		}
		
		if ((Ball.centerY - Ball.radius) <= 0) { //topo
			Ball.vy = -Ball.vy;
			Ball.centerY = 0 + Ball.radius;
		} else if ((Ball.centerY + Ball.radius) >= canvas.height) { //baixo
			Ball.vy = -Ball.vy;
			Ball.centerY = canvas.height - Ball.radius;
		}

		return deathCollision;
  	},
	checkBallPaddleCollision: function(Ball, Paddle) {
		if ((Ball.centerY + Ball.radius) >= Paddle.y && (Ball.centerY - Ball.radius) <= (Paddle.y + Paddle.height)) {

			if ( (Paddle.LEFT && (Ball.centerX - Ball.radius) <= (Paddle.x + Paddle.width)) || (Paddle.RIGHT && (Ball.centerX + Ball.radius) >= Paddle.x) ) {

				if (Ball.centerY < Paddle.y) {
					// hit paddle top lateral
					Ball.centerY = Paddle.y - Ball.radius;
					Ball.vy = -Ball.vy;
				} else if (Ball.centerY > (Paddle.y + Paddle.height)) {
					// hit paddle bottom lateral
					Ball.centerY = (Paddle.y + Paddle.height) + Ball.radius;
					Ball.vy = -Ball.vy;
				} else {
					// hit paddle surface
					if (Paddle.LEFT) {
						Ball.centerX = (Paddle.x + Paddle.width) + Ball.radius;
					} else {
						Ball.centerX = Paddle.x - Ball.radius;
					}
					Ball.vx = -Ball.vx;
				}
				this.makeCollideSound();
			}

		}
	},
  	isCanvasEdge: function(Ball) {
  		return !((Ball.centerX + Ball.radius) < canvas.width) ||  // lateral direita
  			   !((Ball.centerX - Ball.radius > 0)) ||			  // lateral esquerda
  			   !((Ball.centerY + Ball.radius) < canvas.height) || // baixo
  			   !((Ball.centerY - Ball.radius > 0));				  // topo
  	},
  	clearCanvas: function() {
  		context.clearRect(0, 0, canvas.width, canvas.height);
  	},
  	paintCanvas: function() {
		context.fillStyle = "black";
		context.fillRect(0, 0, canvas.width, canvas.height);
	},
	makeCollideSound: function() {
		collideSound.currentTime = 0;
		collideSound.play();
	},
	keyMovePaddle: function(e) {
		if (gameManager.player) {
			if (e.keyCode == 38) {
				// up
				//for (var i = 0 ; i < paddles.length ; i++) {
				//	paddles[i].y -= 25;
				//}
				gameManager.player.paddle.y -= 25;
			} else if (e.keyCode == 40) {
				// down
				//for (var i = 0 ; i < paddles.length ; i++) {
				//	paddles[i].y += 25;
				//}
				gameManager.player.paddle.y += 25;
			}
		}
		e.preventDefault();
	},
	mouseMovePaddle: function(e) {
		//for(var i = 0; i < paddles.length; i++) {
		//	paddles[i].y = e.pageY - paddles[i].height;
		//}
		if (gameManager.player) {
			gameManager.player.paddle.y = e.pageY - gameManager.player.paddle.height;	
		}
		e.preventDefault();
	},
	showGameOver: function() {
		this.gameOvered = true;
		context.font="30px Arial";
		context.fillStyle = "white";
		context.fillText("Game Over!", (canvas.width/2)-85, (canvas.height/2)-30);
		websocketControl.sendMessage("gameOver");
	}
}

function createRadialGradient() {
	// create radial gradient
	var grd = context.createRadialGradient(238, 50, 10, 238, 50, 300);
	// light blue
	grd.addColorStop(0, '#8ED6FF');
	// dark blue
	grd.addColorStop(1, '#004CB3');
	return grd;
}