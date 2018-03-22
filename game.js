var FPS_LOCK = 59.99; //60 reverts to V-Sync, which makes the game too fast on 144hz monitors
var score;
var SCOREBOARD_DIGITS = 5; //Make sure digits is large enough to accomodate for the player score on kill
var SCOREBOARD_LOCATION_X = 100;
var SCOREBOARD_LOCATION_Y = 450;
var SCOREBOARD_BUFFER = 5;

//MenuState is the first game state when the game is loaded. It loads images/menu.png as the background of the canvas.
function MenuState() {
	
	var menu;
	
	this.setup = function() {
		menu = new jaws.Sprite({x: 0, y: 0, image: "images/menu.png"});
	}

	//checks if the player presses the spacebar, which will switch the game state to the PlayState, which is the main part of the game.
	this.update = function() {
		if(jaws.pressed("space")) {
			jaws.switchGameState(PlayState);
		}
	}

	this.draw = function() {
		menu.draw();
	}
}

function PlayState() {

	//CONSTANTS
	var CANVAS_WIDTH = 800;
	var CANVAS_HEIGHT = 600;
	
	var PLAYER_STARTING_X = 20;
	var PLAYER_SPEED = 2;
	var PLAYER_LIVES = 3;
	var PLAYER_SCORE_ON_KILL = 10;
	var PLAYER_BULLET_SPEED = 15;
	var PLAYER_BULLET_NUM = 1;
	var PLAYER_BULLET_UNLOAD_HEIGHT = 0;
	var PLAYER_BULLET_WIDTH = 2;
	var PLAYER_BULLET_HEIGHT = 6;
	var PLAYER_DEATH_LENGTH = 100;
	var PLAYER_LOSE_DELAY = 20;
	var PLAYER_Y = 500;
	var PLAYER_ANIMATION_FRAME_DURATION = 125;
	
	var LIFE_COUNTER_LOCATION = 700;

	var ENEMY_BULLET_NUM = 2;
	var ENEMY_BULLET_SPEED = 5;
	var ENEMY_BULLET_WIDTH = 2;
	var ENEMY_BULLET_HEIGHT = 6;
	var ENEMY_SPEED = 0.2;
	var ENEMY_ANIMATION_FRAME_DURATION = 500;
	var ENEMY_EXPLOSION_DURATION = 5;
	var ENEMY_BULLET_UNLOAD_HEIGHT = CANVAS_HEIGHT;
	
	var ARMY_WIDTH = 20;
	var ARMY_HEIGHT = 7;
	var ARMY_BUFFER_X = 10;
	var ARMY_BUFFER_Y = 5;
	var ARMY_START_X = 110;
	var ARMY_START_Y = 20;
	var ARMY_MOVEMENT_SPEED = 0.5;
	var ARMY_MOVEMENT_CLOCK_TICK_AMOUNT = 0.1;

	//The bullets and enemies arrays have all the sprites for the bullets and the enemies
	var bullets = [];
	var enemies = [];
	var enemyExplosions = [];
	var enemyBullets = [];
	var background;
	var clock;
	var player;
	var playerSheet;
	var enemyAnimation;
	var scoreboard = [];
	var round_number;
	var lives_count;
	var lives_count_number;

	//setup function is called once. It is called first (when the Playstate is started)
	this.setup = function() {
		scoreboard_sheet = new jaws.SpriteSheet({image: "images/numbers.png", frame_size: [10, 20], orientation: "right"});
		for(var i = 0; i < SCOREBOARD_DIGITS; i++) {
			scoreboard.push(new jaws.Sprite({image: scoreboard_sheet.frames[0], x: SCOREBOARD_LOCATION_X + ((10 + SCOREBOARD_BUFFER) * i), y: SCOREBOARD_LOCATION_Y}));
		}
		score = 0;
		scoreboard.update = function() {
			var number = score.toString().split("");
			while(number.length < SCOREBOARD_DIGITS) {
				number.unshift("0");
			}
			if(score <= 99999) {
				for(var i = 0; i < SCOREBOARD_DIGITS; i++) {
					scoreboard[i].setImage(scoreboard_sheet.frames[number[i]]);
				}
			}else{
				for(var i = 0; i < SCOREBOARD_DIGITS; i++) {
					scoreboard[i].setImage(scoreboard_sheet.frames[9]);
				}
			}
		}
		//Takes the sheet of frames in images/player.png and get's frame sizes of 26, 16
		playerAnimation = new jaws.Animation({sprite_sheet: "images/player.png", frame_size: [26, 16], frame_duration: PLAYER_ANIMATION_FRAME_DURATION, orientation: "right"});
		player = new jaws.Sprite({image: playerAnimation.frames[0], x: PLAYER_STARTING_X, y: PLAYER_Y});
		player.lives = PLAYER_LIVES - 2;
		player.anim_death = playerAnimation.slice(1, 3);
		
		//Checks if keys are down and moves player accordingly, called every update
		player.move = function() {
			if(jaws.pressed("a") && !player.isDead && !jaws.pressed("d") && !jaws.pressed("right") || jaws.pressed("left") && !player.isDead && !jaws.pressed("right") && !jaws.pressed("d")){
				if(player.x >= 0){
					player.x -= PLAYER_SPEED;
				}
			}else if(jaws.pressed("d") && !player.isDead && !jaws.pressed("a") && !jaws.pressed("left") || jaws.pressed("right") && !player.isDead && !jaws.pressed("left") && !jaws.pressed("a")) {
				if(player.x <= jaws.width - player.width) {
					player.x += PLAYER_SPEED;
				}
			}
		}
		
		//player.animate animates the player's explosion on death. it takes the frames slice defined player.anim_death and plays it if the player.isDead is true
		var playerAnimateNum = 0;
		player.animate = function() {
			if(player.isDead) {
				player.setImage(player.anim_death.next());
				playerAnimateNum++;
				if(playerAnimateNum >= PLAYER_DEATH_LENGTH && player.lives >= 0) {
					player.lives--;
					if(player.lives !== -1) {
						player.isDead = false;
						player.setImage(playerAnimation.frames[0]);
						playerAnimateNum = 0;
					}
				}
			}
		}
		
		//player.shoot called every update, it checks if space is down
		player.shoot = function() {
			if(bullets.length < PLAYER_BULLET_NUM && jaws.pressed("space") && !player.isDead) {
				bullets.push(new jaws.Sprite({color: "#00FF00", x: player.x + (player.width / 2) - (PLAYER_BULLET_WIDTH / 2), y: player.y, width: PLAYER_BULLET_WIDTH, height: PLAYER_BULLET_HEIGHT}));
			}
		}
		
		//loseWait is how long the player death animation is played and if player.lives is -1 or lower, it will switch to the LoseState game state after an extended delay.
		var loseWait = 0;
		player.lose = function() {
			if(player.lives < 0) {
				loseWait++;
				if(loseWait >= PLAYER_DEATH_LENGTH + PLAYER_LOSE_DELAY) {
					jaws.switchGameState(LoseState);
				}
			}
			for(var i = 0; i < enemies.length; i++) {
				if(enemies[i] !== null) {
					if(enemies[i].y >= PLAYER_Y) {
						player.isDead = true;
						loseWait++;
						if(loseWait >= PLAYER_DEATH_LENGTH + PLAYER_LOSE_DELAY) {
							jaws.switchGameState(LoseState);
						}
					}
				}
			}
		}
		
		//lives_count and lives_count_number is the life counter in the bottom right of the screen. It is a sprite of the player and then a sprite of the number of lives.
		lives_count = new jaws.Sprite({image: playerAnimation.frames[0], x: LIFE_COUNTER_LOCATION, y: PLAYER_Y + 50});
		lives_count_number = new jaws.Sprite({image: scoreboard_sheet.frames[player.lives], x: LIFE_COUNTER_LOCATION - 25, y: PLAYER_Y + 50});
		
		//player.updateLives changes the number sprite to be equal to how many lives the player actually has. (+1 to convert -1 to 0 on the player's screen)
		player.updateLives = function() {
			lives_count_number.setImage(scoreboard_sheet.frames[player.lives + 1]);
		}
		
		//The enemy animation is the two frame animation of the enemies from images/enemy.png
		enemyAnimation = new jaws.Animation({sprite_sheet: "images/enemy.png", frame_size: [22, 16], frame_duration: ENEMY_ANIMATION_FRAME_DURATION, orientation: "right"});
		
		
		//enemies are the enemy that the player tries to eliminate
		round_number = 0;
		enemies.spawn = function() {
			round_number++;
			if(player.lives < 8) {
				player.lives++;
			}
			for(var x = 0; x < ARMY_WIDTH; x++) {
				for(var y = 0; y < ARMY_HEIGHT; y++) {
					enemies.push(new jaws.Sprite({x: x * (22 + ARMY_BUFFER_X) + ARMY_START_X, y: y * (16 + ARMY_BUFFER_Y) + ARMY_START_Y}));
					enemies[y + (ARMY_HEIGHT * x)].anim_default = enemyAnimation.slice(0, 2);
				}
			}
		}
		enemies.spawn();
		
		var enemyMoveNum = 0;
		var enemyAcceleration = 1;
		enemies.move = function() {
			if(enemies.length > 0) {
				if(enemies[Math.max(enemies.length - 1, 0)].x <= CANVAS_WIDTH - 44 && enemyMoveNum % 2 == 0) {
					for(var i = 0; i < enemies.length; i++) {
						enemies[i].x += ENEMY_SPEED * enemyAcceleration; 
					}
				}else if(enemies[Math.max(enemies.length - 1, 0)].x >= CANVAS_WIDTH - 44 && enemyMoveNum % 2 == 0) {
					enemyMoveNum++;
					for(var i = 0; i < enemies.length; i++) {
						enemies[i].y += 21;
					}
				}else if(enemies[0].x >= 33 && enemyMoveNum % 2 !== 0) {
					for(var i = 0; i < enemies.length; i++) {
						enemies[i].x -= ENEMY_SPEED * enemyAcceleration; 
					}
				}else if(enemies[0].x <= 33 && enemyMoveNum % 2 !==0) {
					enemyMoveNum++;
					for(var i = 0; i < enemies.length; i++) {
						enemies[i].y += 21;
					}
				}
			}
			//as there are more rounds, and as there are less enemies on screen, the enemies will accelerate
			enemyAcceleration = 1 + ((ARMY_WIDTH * ARMY_HEIGHT) - enemies.length) / (25 - round_number);
		}
		
		//enemies.shoot is the function that spawns bullets at random enemy positions there are a limited number of bullets allowed on screen
		enemies.shoot = function() {
			if(enemies.length > 0) {
				if(enemyBullets.length < ENEMY_BULLET_NUM) {
					var num = Math.floor(Math.random() * enemies.length);
					enemyBullets.push(new jaws.Sprite({x: enemies[num].x + (enemies[num].width / 2) - (ENEMY_BULLET_WIDTH / 2), y: enemies[num].y, width: ENEMY_BULLET_WIDTH, height: ENEMY_BULLET_HEIGHT}));
				}
			}
		}
		
		//enemies.animate plays the enemy animation defined earlier. It plays the enemy's anim_default animation which is the two frame animation.
		enemies.animate = function() {
			for(var i = 0; i < enemies.length; i++) {
				if(enemies[i] !== null) {
					enemies[i].setImage(enemies[i].anim_default.next());
				}
			}
		}
		
		//when bullet.y or enemyBullets.y < 0 (or off screen) it removes the sprite from the array effectively removing it from the game.
		bullets.unloadOffscreenBullets = function() {
			for(var i = 0; i < bullets.length; i++) {
				if(bullets[i].y < PLAYER_BULLET_UNLOAD_HEIGHT) {
					bullets.splice(i, 1);
				}
			}
			for(var i = 0; i < enemyBullets.length; i++) {
				if(enemyBullets[i].y > ENEMY_BULLET_UNLOAD_HEIGHT) {
					enemyBullets.splice(i, 1);
				}
			}
		}
		
		//loops through the bullets array and makes every bullet move up 15 pixels.
		bullets.move = function() {
			for(var i = 0; i < bullets.length; i++) {
				bullets[i].y -= PLAYER_BULLET_SPEED;
			}
			for(var i = 0; i < enemyBullets.length; i++) {
				enemyBullets[i].y += ENEMY_BULLET_SPEED;
			}
		}
		
		//checks for collision between all bullets and any enemy.
		bullets.checkCollision = function() {
			for(var i = 0; i < enemies.length; i++) {
				for(var x = 0; x < bullets.length; x++) {
					if(bullets[x] !== null && enemies[i] !== null) {
						if(jaws.collideOneWithOne(bullets[x], enemies[i])) {
							bullets.splice(x, 1);
							enemyExplosions.push([new jaws.Sprite({image: enemyAnimation.frames[2], x: enemies[i].x, y: enemies[i].y}), 0]);
							enemies.splice(i, 1);
							score += PLAYER_SCORE_ON_KILL;
						}
					}
				}
			}
		}
		
		//collision detection for the bullets shot by the enemies. Between player and each bullet.
		enemyBullets.checkCollision = function() {
			if(!player.isDead) {
				for(var i = 0; i < enemyBullets.length; i++) {
					if(player !== null && enemyBullets[i] !== null) {
						if(jaws.collideOneWithOne(player, enemyBullets[i])) {
							player.isDead = true;
						}
					}
				}
			}
		}
		//black background
		background = new jaws.Sprite({color: "#000000", x: 0, y: 0, width: jaws.width, height: jaws.height});
	}

	//update is called repeatedly
	this.update = function() {
		player.animate();
		player.move();
		player.shoot();
		enemies.animate();
		enemies.move();
		enemies.shoot();
		bullets.checkCollision();
		enemyBullets.checkCollision();
		bullets.unloadOffscreenBullets();
		bullets.move();
		player.lose();
		scoreboard.update();
		if(enemies.length == 0) {
			enemies.spawn();
		}
		player.updateLives();
	}

	//draw function is called right after every update call.
	this.draw = function() {
		jaws.clear();

		//Background needs to always be drawn first after clearing
		background.draw();
		player.draw();
		for(var i = 0; i < bullets.length; i++) {
			bullets[i].draw();
		}
		for(var i = 0; i < enemyBullets.length; i++) {
			enemyBullets[i].draw();
		}
		for(var i = 0; i < enemyExplosions.length; i++) {
			enemyExplosions[i][0].draw();
			enemyExplosions[i][1]++;
			if(enemyExplosions[i][1] >= ENEMY_EXPLOSION_DURATION) {
				enemyExplosions.splice(i, 1);
			}
		}
		for(var i = 0; i < enemies.length; i++) {
			enemies[i].draw();
		}
		for(var i = 0; i < scoreboard.length; i++) {
			scoreboard[i].draw();
		}
		lives_count.draw();
		lives_count_number.draw();
	}
}

//The lose state is the game state that is switched to when the player runs out of lives or is overtaken by the enemies. It shows the player's score, and sets the background to images/lose_screen.png
function LoseState() {
	
	var lose = new jaws.Sprite({image: "images/lose_screen.png", x: 0, y: 0});
	var scoreboard = [];
	
	this.setup = function() {
		scoreboard_sheet = new jaws.SpriteSheet({image: "images/numbers.png", frame_size: [10, 20], orientation: "right"});
		for(var i = 0; i < SCOREBOARD_DIGITS; i++) {
			scoreboard.push(new jaws.Sprite({image: scoreboard_sheet.frames[0], x: jaws.width / 2 - 30 + (i * 15), y: jaws.height / 2 + 100}));
		}
		var number = score.toString().split("");
		while(number.length < SCOREBOARD_DIGITS) {
			number.unshift("0");
		}
		if(score <= 99999) {
			for(var i = 0; i < SCOREBOARD_DIGITS; i++) {
				scoreboard[i].setImage(scoreboard_sheet.frames[number[i]]);
			}
		}else{
			for(var i = 0; i < SCOREBOARD_DIGITS; i++) {
				scoreboard[i].setImage(scoreboard_sheet.frames[9]);
			}
		}
	}
	
	//because there are not updates necessary, we don't need the update function
	
	//draws the score and the background.
	this.draw = function() {
		jaws.clear();
		lose.draw();
		for(var i = 0; i < scoreboard.length; i++) {
			scoreboard[i].draw();
		}
	}
}

//on load, jaws will start the MenuState game state and it will preload all of the textures so they are available while the game is running.
jaws.onload = function() {
	jaws.assets.add(["images/player.png", "images/enemy.png", "images/numbers.png", "images/lose_screen.png", "images/menu.png"]);
	jaws.start(MenuState, {fps: FPS_LOCK});
}