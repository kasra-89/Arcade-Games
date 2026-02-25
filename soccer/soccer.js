const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game Constants
const FIELD_WIDTH = 1200;
const FIELD_HEIGHT = 700;
const GOAL_WIDTH = 150;
const GOAL_HEIGHT = 200;
const GOAL_Y = (FIELD_HEIGHT - GOAL_HEIGHT) / 2;

// Player Class
class Player {
  constructor(x, y, isAI = false) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 30;
    this.vx = 0;
    this.vy = 0;
    this.speed = 5;
    this.sprintSpeed = 7;
    this.isAI = isAI;
    this.color = isAI ? '#ff6b6b' : '#4ecdc4';
    this.isSprinting = false;
    this.kickPower = 0;
    this.canKick = true;
  }

  update(ball, otherPlayer, keysPressed) {
    if (!this.isAI) {
      // Player controls
      let moveX = 0;
      let moveY = 0;
      
      if (keysPressed['ArrowLeft'] || keysPressed['a']) moveX = -1;
      if (keysPressed['ArrowRight'] || keysPressed['d']) moveX = 1;
      if (keysPressed['ArrowUp'] || keysPressed['w']) moveY = -1;
      if (keysPressed['ArrowDown'] || keysPressed['s']) moveY = 1;

      this.isSprinting = keysPressed['Shift'];
      const currentSpeed = this.isSprinting ? this.sprintSpeed : this.speed;

      if (moveX !== 0 || moveY !== 0) {
        const length = Math.sqrt(moveX * moveX + moveY * moveY);
        this.vx = (moveX / length) * currentSpeed;
        this.vy = (moveY / length) * currentSpeed;
      } else {
        this.vx *= 0.9;
        this.vy *= 0.9;
      }

      // Handle kick
      if (keysPressed[' '] && this.canKick) {
        this.kickBall(ball);
        this.canKick = false;
      }
    } else {
      // AI Logic
      this.aiUpdate(ball, otherPlayer);
    }

    // Update position
    this.x += this.vx;
    this.y += this.vy;

    // Boundary collision
    this.x = Math.max(this.width / 2, Math.min(FIELD_WIDTH - this.width / 2, this.x));
    this.y = Math.max(this.height / 2, Math.min(FIELD_HEIGHT - this.height / 2, this.y));
  }

  aiUpdate(ball, otherPlayer) {
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 100) {
      // Move towards ball
      const moveX = dx / distance;
      const moveY = dy / distance;
      this.vx = moveX * this.speed;
      this.vy = moveY * this.speed;

      // Kick if close
      if (distance < 40 && this.canKick) {
        this.kickBall(ball);
        this.canKick = false;
      }
    } else {
      // Move to center-left area
      const targetX = 300;
      const targetY = FIELD_HEIGHT / 2;
      const dx2 = targetX - this.x;
      const dy2 = targetY - this.y;
      const distance2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      
      if (distance2 > 20) {
        this.vx = (dx2 / distance2) * (this.speed * 0.7);
        this.vy = (dy2 / distance2) * (this.speed * 0.7);
      } else {
        this.vx *= 0.8;
        this.vy *= 0.8;
      }
    }
  }

  kickBall(ball) {
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 40) {
      const kickStrength = 15;
      const angle = Math.atan2(dy, dx);
      ball.vx = Math.cos(angle) * kickStrength;
      ball.vy = Math.sin(angle) * kickStrength;
      
      // Add some randomness to AI kicks
      if (this.isAI) {
        ball.vx += (Math.random() - 0.5) * 4;
        ball.vy += (Math.random() - 0.5) * 4;
      }
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw number on player
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.isAI ? 'AI' : 'P', this.x, this.y);

    // Sprint indicator
    if (this.isSprinting) {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.width / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

// Ball Class
class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 8;
    this.friction = 0.98;
    this.gravity = 0.4;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.friction;
    this.vy *= this.friction;

    // Wall collision
    if (this.x - this.radius < 0 || this.x + this.radius > FIELD_WIDTH) {
      this.vx *= -0.9;
      this.x = Math.max(this.radius, Math.min(FIELD_WIDTH - this.radius, this.x));
    }

    if (this.y - this.radius < 0 || this.y + this.radius > FIELD_HEIGHT) {
      this.vy *= -0.9;
      this.y = Math.max(this.radius, Math.min(FIELD_HEIGHT - this.radius, this.y));
    }
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  distanceTo(x, y) {
    const dx = this.x - x;
    const dy = this.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// Game Class
class Game {
  constructor() {
    this.player = new Player(100, FIELD_HEIGHT / 2, false);
    this.ai = new Player(FIELD_WIDTH - 100, FIELD_HEIGHT / 2, true);
    this.ball = new Ball(FIELD_WIDTH / 2, FIELD_HEIGHT / 2);
    
    this.playerScore = 0;
    this.aiScore = 0;
    this.gameTime = 120; // 2 minutes
    this.gameRunning = true;
    this.goalCooldown = 0;
    
    this.keysPressed = {};
    this.setupControls();
  }

  setupControls() {
    document.addEventListener('keydown', (e) => {
      this.keysPressed[e.key] = true;
      if (e.key === ' ') e.preventDefault();
    });

    document.addEventListener('keyup', (e) => {
      this.keysPressed[e.key] = false;
    });

    document.getElementById('restartButton').addEventListener('click', () => {
      location.reload();
    });
  }

  update() {
    if (!this.gameRunning) return;

    this.gameTime -= 1 / 60;
    if (this.gameTime <= 0) {
      this.endGame();
      return;
    }

    this.player.update(this.ball, this.ai, this.keysPressed);
    this.ai.update(this.ball, this.player, {});
    this.ball.update();

    // Reset kick ability when space is released
    if (!this.keysPressed[' ']) {
      this.player.canKick = true;
      this.ai.canKick = true;
    }

    // Player collision with ball
    if (this.ball.distanceTo(this.player.x, this.player.y) < 30) {
      this.ball.vx += this.player.vx * 0.5;
      this.ball.vy += this.player.vy * 0.5;
    }

    // AI collision with ball
    if (this.ball.distanceTo(this.ai.x, this.ai.y) < 30) {
      this.ball.vx += this.ai.vx * 0.5;
      this.ball.vy += this.ai.vy * 0.5;
    }

    // Goal detection
    if (this.goalCooldown > 0) {
      this.goalCooldown--;
    }

    // Player scores (right goal)
    if (this.ball.x > FIELD_WIDTH - 20 && 
        this.ball.y > GOAL_Y && 
        this.ball.y < GOAL_Y + GOAL_HEIGHT && 
        this.goalCooldown === 0) {
      this.playerScore++;
      this.resetBall();
      this.goalCooldown = 120;
    }

    // AI scores (left goal)
    if (this.ball.x < 20 && 
        this.ball.y > GOAL_Y && 
        this.ball.y < GOAL_Y + GOAL_HEIGHT && 
        this.goalCooldown === 0) {
      this.aiScore++;
      this.resetBall();
      this.goalCooldown = 120;
    }
  }

  resetBall() {
    this.ball.x = FIELD_WIDTH / 2;
    this.ball.y = FIELD_HEIGHT / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;
  }

  endGame() {
    this.gameRunning = false;
    document.getElementById('gameOverScreen').style.display = 'flex';
    
    let winner = 'TIE!';
    let winColor = '#ffff00';
    if (this.playerScore > this.aiScore) {
      winner = 'YOU WIN!';
      winColor = '#4CAF50';
    } else if (this.aiScore > this.playerScore) {
      winner = 'YOU LOSE!';
      winColor = '#ff6b6b';
    }
    
    document.getElementById('gameOverText').textContent = winner;
    document.getElementById('gameOverText').style.color = winColor;
    document.getElementById('finalScore').textContent = 
      `Final Score: ${this.playerScore} - ${this.aiScore}`;
  }

  draw() {
    // Field
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);

    // Field lines
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;

    // Center line
    ctx.beginPath();
    ctx.moveTo(FIELD_WIDTH / 2, 0);
    ctx.lineTo(FIELD_WIDTH / 2, FIELD_HEIGHT);
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(FIELD_WIDTH / 2, FIELD_HEIGHT / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Goals
    ctx.fillStyle = 'rgba(100, 150, 255, 0.3)';
    
    // Left goal (AI)
    ctx.fillRect(0, GOAL_Y, 20, GOAL_HEIGHT);
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, GOAL_Y, 20, GOAL_HEIGHT);

    // Right goal (Player)
    ctx.fillStyle = 'rgba(255, 150, 100, 0.3)';
    ctx.fillRect(FIELD_WIDTH - 20, GOAL_Y, 20, GOAL_HEIGHT);
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(FIELD_WIDTH - 20, GOAL_Y, 20, GOAL_HEIGHT);

    // Draw game objects
    this.player.draw();
    this.ai.draw();
    this.ball.draw();

    // Goal indicators
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = '#4ecdc4';
    ctx.textAlign = 'center';
    ctx.fillText('AI GOAL', 50, GOAL_Y - 20);

    ctx.fillStyle = '#ffff00';
    ctx.fillText('YOUR GOAL', FIELD_WIDTH - 50, GOAL_Y - 20);
  }

  run() {
    const gameLoop = () => {
      this.update();
      this.draw();
      this.updateHUD();
      requestAnimationFrame(gameLoop);
    };
    gameLoop();
  }

  updateHUD() {
    document.getElementById('score').textContent = 
      `Player: ${this.playerScore} | AI: ${this.aiScore}`;
    
    const minutes = Math.floor(this.gameTime / 60);
    const seconds = Math.floor(this.gameTime % 60);
    document.getElementById('timer').textContent = 
      `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Start Game
const game = new Game();
game.run();
