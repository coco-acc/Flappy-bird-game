class Bird {
    constructor(x, y, width, height, imgSrc) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocityY = 0;
        this.gravity = 0.4;
        this.img = new Image();
        this.img.src = imgSrc;
    }

    move() {
        this.velocityY += this.gravity;
        this.y = Math.max(this.y + this.velocityY, 0);
    }

    draw(context) {
        context.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
}

class Pipe {
    constructor(x, y, width, height, img) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.passed = false;
        this.img = img; // Use preloaded image
    }
    move(speed) {
        this.x += speed;
    }

    draw(context) {
        context.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
}

class AudioManager {
    constructor(buttonClick, backButton, flap, collision) {
        this.sounds = {
            buttonClick: new Audio(buttonClick),
            backButton: new Audio(backButton),
            flap: new Audio(flap),
            collision: new Audio(collision),
        };
        this.soundEnabled = true; // Default to true
    }

    play(sound) {
        if (this.soundEnabled && this.sounds[sound]) {
            //console.log("Playing sound:", sound); // Debug log
            this.sounds[sound].currentTime = 0;
            this.sounds[sound].play();
        } else {
            //console.log("Sound is disabled or not found:", sound);
        }
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        console.log("Sound toggled:", this.soundEnabled); // Debugging log
    }
}

class Game {
    constructor() {
        this.board = document.getElementById('board');
        this.context = this.board.getContext('2d');
        this.board.width = 360;
        this.board.height = 640;

        this.bird = new Bird(this.board.width / 8, this.board.height / 2, 34, 24, "./flappybird.png");
        this.pipes = [];

        this.pipeWidth = 64;
        this.pipeHeight = 512;
        this.pipeX = this.board.width;
        this.pipeY = 0;

        this.pipeTopImg = new Image();
        this.pipeTopImg.src = "./toppipe.png";

        this.pipeBottomImg = new Image();
        this.pipeBottomImg.src = "./bottompipe.png";


        this.soundEnabled = true; // Default value
        this.audioManager = new AudioManager(
            "./SFX/menu-button.mp3",
            "./SFX/menu-button.mp3",
            "./SFX/flapping.mp3",
            "./SFX/rubble-crash.mp3"
        );
        this.audioManager.soundEnabled = this.soundEnabled; // Sync

        //movement speed for pipes and levels
        this.levels = {
            soft: -3,
            normal: -2,
            medium: -1.75,
            hard: -1.55
        };
        this.velocityX = this.levels.normal;

        this.currentLevel = "normal"; // Default level
        this.gameStarted = false;
        this.gameOver = false;
        this.paused = false; // Pause state
        this.score = 0;

         this.pauseButton = {
            x: this.board.width / 2,
            y: 30,
            width: 40,
            height: 40
        };

        document.addEventListener("click", () => {
            Object.values(this.audioManager.sounds).forEach(sound => {
                sound.play().catch(() => {}); // Ignore autoplay errors
                sound.pause();
                sound.currentTime = 0;
            });
        }, { once: true });

        this.buttonClickHandlers = [];

        document.addEventListener("keydown", (e) => this.moveBird(e));
        document.addEventListener("click", (e) => this.handleClick(e));
    }

    start() {
	    if (this.pipeInterval) {
	        clearInterval(this.pipeInterval); // Clear existing interval
	    }
	    this.gameStarted = true;
        this.paused = false;
	    requestAnimationFrame(() => this.update());
	    this.pipeInterval = setInterval(() => this.placePipes(), 1500); // Store interval reference
	}

    update() {
        if (!this.gameStarted || this.gameOver || this.paused) return;

        requestAnimationFrame(() => this.update());
        this.context.clearRect(0, 0, this.board.width, this.board.height);

        this.drawPauseButton();
        this.drawBackButton();
        this.drawBackButton();
        this.bird.move();
        console.log('velocityY:',this.bird.velocityY);

        this.bird.draw(this.context);

         if (this.bird.y > this.board.height) {
            this.gameOver = true;
        }

        for (let i = 0; i < this.pipes.length; i++) {
            let pipe = this.pipes[i];

            pipe.move(this.velocityX);
            pipe.draw(this.context);

            if (!pipe.passed && this.bird.x > pipe.x + pipe.width) {
                this.score += 0.5;
                pipe.passed = true;
            }

            // ✅ Optimized Collision Check
            if (pipe.x + pipe.width < this.bird.x - 10) {
                continue; // Skip checking pipes already passed
            }

            if (this.detectCollision(this.bird, pipe)) {
                this.gameOver = true;
                break;
            }
        }

        if (!this.gameOver) {
            this.pipes = this.pipes.filter(pipe => pipe.x > -this.pipeWidth);
        }
        this.drawScore();
    }

    placePipes() {
        if (this.gameOver || !this.gameStarted || this.paused) return;
        let randomPipeY = this.pipeY - this.pipeHeight / 4 - Math.random() * (this.pipeHeight / 2);
        let openingSpace = this.board.height / 4;

        this.pipes.push(new Pipe(this.pipeX, randomPipeY, this.pipeWidth, this.pipeHeight, this.pipeTopImg));
        this.pipes.push(new Pipe(this.pipeX, randomPipeY + this.pipeHeight + openingSpace, this.pipeWidth, this.pipeHeight, this.pipeBottomImg));

    }

    moveBird(e) {
	    if (!this.gameStarted) return;
	    
	    if (e.key === " " || e.key === "ArrowUp" || e.key === "x") {
	        if (!this.gameOver) {
	            this.bird.velocityY = -6;
                this.audioManager.play("flap"); // Play flap sound
	        } else if (!this.restartPending) {
	            this.restartPending = true; // Prevent multiple restarts
	            setTimeout(() => {
	                this.restartPending = false;
	                this.resetGame();
	            }, 500);
	        }
	    }
	}

    detectCollision(a, b) {
        return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
        this.audioManager.play("collision"); // Play collision sound
    }

    resetGame() {
        this.bird.y = this.board.height / 2;
        this.bird.velocityY = 0; // Reset velocity to remove excess downward force
    
        this.pipes = []; // Clear pipes after a delay to ensure they are visible after game over
        this.score = 0;
        this.gameOver = false;
        this.restartPending = false;

        this.start(); // Restart the game loop
    }


    drawScore() {
        this.context.fillStyle = "white";
        this.context.font = '45px sans-serif';
        this.context.fillText(this.score, 5, 45);
        if (this.gameOver) {
            this.context.fillText('GAME OVER!', this.board.width / 8, this.board.height / 2);
        }
    }

    drawPauseButton() {
        this.context.fillStyle = "white";
        this.context.font = "30px sans-serif";
        this.context.fillText("||", this.board.width / 2 - 10, 40);
        this.pauseButton = { x: this.board.width / 2 - 10, y: 20, width: 20, height: 30 };
    }

    drawBackButton() {
        this.context.fillStyle = "white";
        this.context.font = "40px sans-serif";
        this.context.fillText("\u2190", this.board.width - 40, 40); // Draw back arrow at a fixed position

        // Store the back button position for click detection
        this.backButton = { x: this.board.width - 40, y: 20, width: 40, height: 40 };
    }

    handleClick(event) {
	    let rect = this.board.getBoundingClientRect();
	    let mouseX = event.clientX - rect.left;
	    let mouseY = event.clientY - rect.top;

     /// Check if the back button is clicked
        if (this.backButton && 
            mouseX > this.backButton.x && mouseX < this.backButton.x + this.backButton.width &&
            mouseY > this.backButton.y && mouseY < this.backButton.y + this.backButton.height) {
            this.audioManager.play("backButton"); // Play back button sound
            this.goToMenu();
            return;
        }

        // Check if pause button is clicked
        if (mouseX > this.pauseButton.x && mouseX < this.pauseButton.x + this.pauseButton.width &&
            mouseY > this.pauseButton.y && mouseY < this.pauseButton.y + this.pauseButton.height) {
            this.togglePause();
        }

        // Check other button clicks
        this.buttonClickHandlers.forEach(({ x, y, width, height, onClick }) => {
            if (mouseX > x - width / 2 && mouseX < x + width / 2 &&
                mouseY > y - height / 2 && mouseY < y + height / 2) {
                this.audioManager.play("buttonClick");
                onClick();
            }
        });

        // Iterate over button handlers and check clicks
        for (let button of this.buttonClickHandlers) {
            if (
                mouseX > button.x - button.width / 2 &&
                mouseX < button.x + button.width / 2 &&
                mouseY > button.y - button.height / 2 &&
                mouseY < button.y + button.height / 2
            ) {
                this.audioManager.play("buttonClick");
                button.onClick();
                return; // Prevent multiple clicks
            }
        }

        if (!this.gameStarted) {
            if (this.isInsideButton(mouseX, mouseY, this.board.width / 3, this.board.height / 2)) {
                this.audioManager.play("buttonClick");
                this.start(); 
            } else if (this.isInsideButton(mouseX, mouseY, this.board.width / 3, this.board.height / 2 + 60)) {
                this.audioManager.play("buttonClick");
                this.showSettings();
            } else if (this.isInsideButton(mouseX, mouseY, this.board.width / 3, this.board.height / 2 + 120)) {
                this.audioManager.play("buttonClick");
                this.showHelpMenu();
            }
	    } else {
	        if (this.isInsideCircle(mouseX, mouseY, this.board.width - 30, 30, 20)) {
                this.audioManager.play("backButton"); // Play back button sound
	            this.goToMenu();
	        }
	    }

        console.log(`Mouse Clicked at: (${mouseX}, ${mouseY})`);
	}

    togglePause() {
        if (this.gameOver) return; // Prevent pausing if the game is over

        this.paused = !this.paused;
        if (this.paused) {
            this.showPauseMessage();
        } else {
            requestAnimationFrame(() => this.update());
        }
    }


	isInsideButton(x, y, btnX, btnY) {
	    return x > btnX - 10 && x < btnX + 130 && y > btnY - 30 && y < btnY + 10;
	}

	isInsideCircle(x, y, circleX, circleY, radius) {
	    let dx = x - circleX;
	    let dy = y - circleY;
	    return dx * dx + dy * dy <= radius * radius;
	}

    showPauseMessage() {
        this.context.fillStyle = "rgba(0, 0, 0, 0.5)";
        this.context.fillRect(0, 0, this.board.width, this.board.height);
        this.context.fillStyle = "white";
        this.context.font = "40px Arial";
        this.context.fillText("Game Paused", this.board.width / 4, this.board.height / 2);
    }

	showSettings() {
        this.context.clearRect(0, 0, this.board.width, this.board.height);
        this.context.fillStyle = "rgba(173, 216, 230,1)";
        this.context.fillRect(0, 0, this.board.width, this.board.height);
        
        this.context.fillStyle = "black";
        this.context.font = "30px Arial";
        this.context.fillText("Settings", this.board.width / 3, 80);
        
        // Sound Toggle Button
        this.drawButton(`Sound: ${this.soundEnabled ? "ON" : "OFF"}`, this.board.width / 2, 200, () => {
            this.soundEnabled = !this.soundEnabled;
            this.audioManager.soundEnabled = this.soundEnabled; // Sync with AudioManager
            this.showSettings(); // Redraw settings menu
        });


        // Level Selection Buttons
        let levels = ["soft", "normal", "medium", "hard"];
        levels.forEach((level, index) => {
            this.drawButton(level, this.board.width / 2, 300 + index * 50, () => {
                this.currentLevel = level;
                this.velocityX = this.levels[level];
                this.showSettings(); // Redraw settings menu with updated value
            });
        });

        // Draw Circular Back Button
        this.drawBackButton();
    }

    showHelpMenu() {
        this.context.clearRect(0, 0, this.board.width, this.board.height);
        this.context.fillStyle = "rgba(173, 216, 230,1)";
        this.context.fillRect(0, 0, this.board.width, this.board.height);
        this.context.fillStyle = "black";
        this.context.font = "15px Arial";
        this.context.fillText("Press SPACE, ArrowUP or X to jump", this.board.width / 8, this.board.height / 2 - 20);
        this.context.fillText("Avoid hitting the pipes!", this.board.width / 8, this.board.height / 2 + 20);

        // Draw Circular Back Button
        this.drawBackButton();
    }

    goToMenu() {
        this.gameStarted = false;
        this.gameOver = false;
        this.score = 0;
        this.pipes = [];

        this.buttonClickHandlers = []; // Clear event listeners
        this.drawMenu();
    }

   drawButton(text, x, y, onClick) {
        const buttonWidth = 140;
        const buttonHeight = 40;
        
        // Draw button
        this.context.fillStyle = "blue";
        this.context.fillRect(x - buttonWidth / 2, y - buttonHeight / 2, buttonWidth, buttonHeight);
        
        // Draw text
        this.context.fillStyle = "white";
        this.context.font = "20px Arial";
        const textWidth = this.context.measureText(text).width;
        this.context.fillText(text, x - textWidth / 2, y + 6);

        // Debugging: Check if onClick is valid
        if (typeof onClick !== "function") {
            console.error(`Invalid onClick handler for button: ${text}`, onClick);
            return;
        }

        // Store button data with a valid onClick function
        this.buttonClickHandlers.push({ x, y, width: buttonWidth, height: buttonHeight, onClick });
    }

    drawMenu() {
        this.context.clearRect(0, 0, this.board.width, this.board.height);
        this.context.fillStyle = "rgba(173, 216, 230,1)";
        this.context.fillRect(0, 0, this.board.width, this.board.height);
        this.context.fillStyle = "black";
        this.context.font = "40px Arial";

        // Centered title
        const titleText = "Flappy Bird";
        const titleWidth = this.context.measureText(titleText).width;
        this.context.fillText(titleText, (this.board.width - titleWidth) / 2, this.board.height / 4);

        // Center buttons horizontally
        const centerX = this.board.width / 2;
        
        // ✅ Pass proper onClick functions
        this.drawButton("Play", centerX, this.board.height / 2, () => {
            this.audioManager.play("buttonClick");
            this.start();
        });

        this.drawButton("Settings", centerX, this.board.height / 2 + 60, () => {
            this.audioManager.play("buttonClick");
            this.showSettings();
        });

        this.drawButton("Help", centerX, this.board.height / 2 + 120, () => {
            this.audioManager.play("buttonClick");
            this.showHelpMenu();
        });
    }
}

class LoadingScreen {
    constructor(board) {
        this.board = board;
        this.context = board.getContext('2d');
        this.isLoading = true;
        this.progress = 0;
    }

    show() {
        this.isLoading = true;
        this.progress = 0;
        this.update();
    }

    hide() {
        this.isLoading = false;
    }

    update() {
        if (!this.isLoading) return;
        
        this.context.clearRect(0, 0, this.board.width, this.board.height);
        this.context.fillStyle = "black";
        this.context.fillRect(0, 0, this.board.width, this.board.height);
        
        this.context.fillStyle = "white";
        this.context.font = "30px Arial";
        this.context.fillText("Loading...", this.board.width / 2 - 50, this.board.height / 2 - 20);
        
        // Simulated loading bar
        this.context.strokeStyle = "white";
        this.context.strokeRect(this.board.width / 4, this.board.height / 2, this.board.width / 2, 20);
        this.context.fillStyle = "white";
        this.context.fillRect(this.board.width / 4, this.board.height / 2, (this.progress / 100) * (this.board.width / 2), 20);
        
        if (this.progress < 100) {
            this.progress += 2; // Simulate loading progress
            setTimeout(() => this.update(), 50);
        } else {
            this.hide();
        }
    }
}

// Integrate with the game
window.onload = function () {
    let game = new Game();
    let loadingScreen = new LoadingScreen(game.board);
    
    loadingScreen.show();
    
    // Simulate asset loading
    setTimeout(() => {
        game.drawMenu();
    }, 4000); // Show loading screen for 3 seconds before showing the menu
};