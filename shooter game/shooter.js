const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

class Particle {
  constructor(x, y, vx, vy, color, lifetime = 20) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.lifetime = lifetime; this.age = 0;
    this.size = Math.random() * 3 + 1;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.15;
    this.age++;
  }
  draw(ctx) {
    ctx.globalAlpha = 1 - (this.age / this.lifetime);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  isDead() { return this.age >= this.lifetime; }
}

class Projectile {
  constructor(x, y, vx, vy, damage, isPlayerProjectile = true) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.damage = damage;
    this.isPlayerProjectile = isPlayerProjectile;
    this.w = 4; this.h = 12;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
  }
  draw(ctx) {
    ctx.fillStyle = this.isPlayerProjectile ? '#00ff88' : '#ff4444';
    ctx.fillRect(this.x - this.w/2, this.y - this.h/2, this.w, this.h);
  }
  isOffScreen() { return this.y < -10 || this.y > canvas.height + 10; }
}

class PowerUp {
  constructor(x, y, type) {
    this.x = x; this.y = y;
    this.type = type; // 'health', 'rapid_fire', 'spread', 'shield'
    this.w = 20; this.h = 20;
    this.vy = 2;
    this.rotation = 0;
  }
  update() {
    this.y += this.vy;
    this.rotation += 0.05;
  }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    const colors = { health: '#00ff00', rapid_fire: '#ffff00', spread: '#ff88ff', shield: '#00bfff', ammo: '#ff8800' };
    ctx.fillStyle = colors[this.type] || '#fff';
    ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-this.w/2, -this.h/2, this.w, this.h);
    ctx.restore();
  }
  isOffScreen() { return this.y > canvas.height + 20; }
}

class Enemy {
  constructor(x, y, type = 'basic', level = 1) {
    this.x = x; this.y = y; this.type = type;
    this.level = level;
    const stats = {
      basic: { w: 25, h: 25, hp: 1, speed: 2, damage: 10, score: 100, fireRate: 60 },
      fast: { w: 20, h: 20, hp: 1, speed: 4, damage: 5, score: 150, fireRate: 30 },
      heavy: { w: 35, h: 35, hp: 3, speed: 1, damage: 20, score: 300, fireRate: 120 },
      sinker: { w: 22, h: 22, hp: 2, speed: 1.5, damage: 15, score: 200, fireRate: 90 },
    };
    const stat = stats[type];
    this.w = stat.w; this.h = stat.h;
    this.hp = stat.hp * (1 + level * 0.2);
    this.maxHp = this.hp;
    this.speed = stat.speed * (1 + level * 0.1);
    this.damage = stat.damage * (1 + level * 0.1);
    this.score = stat.score * (1 + level * 0.1);
    this.fireRate = stat.fireRate;
    this.lastShot = 0;
    this.vx = 0; this.vy = this.speed;
    this.shootTimer = Math.random() * 60;
    this.waveOffset = Math.random() * Math.PI * 2;
  }
  update(player, projectiles, game) {
    this.y += this.vy;
    if (this.type === 'sinker') this.x += Math.sin(this.y * 0.02 + this.waveOffset) * 1.5;
    
    this.shootTimer++;
    if (this.shootTimer >= this.fireRate) {
      projectiles.push(new Projectile(this.x, this.y + this.h/2, 0, 3, this.damage, false));
      this.shootTimer = 0;
    }
  }
  draw(ctx) {
    const colors = { basic: '#ff4444', fast: '#ff8844', heavy: '#ff0000', sinker: '#ff22ff' };
    ctx.fillStyle = colors[this.type];
    ctx.fillRect(this.x - this.w/2, this.y - this.h/2, this.w, this.h);
    
    // HP bar
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(this.x - this.w/2, this.y - this.h/2 - 8, this.w, 4);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(this.x - this.w/2, this.y - this.h/2 - 8, (this.hp / this.maxHp) * this.w, 4);
  }
  isOffScreen() { return this.y > canvas.height + 20; }
}

class Boss {
  constructor(level) {
    this.x = canvas.width / 2;
    this.y = 80;
    this.w = 60; this.h = 60;
    this.hp = 50 * level;
    this.maxHp = this.hp;
    this.speed = 1;
    this.vx = this.speed;
    this.level = level;
    this.shootTimer = 0;
    this.phase = 1;
    this.patternTimer = 0;
    this.name = 'kaziX';
  }
  update(projectiles) {
    this.x += this.vx;
    if (this.x - this.w/2 < 0 || this.x + this.w/2 > canvas.width) {
      this.vx *= -1;
    }
    
    this.shootTimer++;
    this.patternTimer++;
    const fireRate = 20 - (this.phase - 1) * 5;
    
    if (this.shootTimer >= fireRate) {
      if (this.patternTimer % 15 === 0) {
        // Spread shot
        for (let i = -1; i <= 1; i++) {
          projectiles.push(new Projectile(this.x + i * 15, this.y + this.h/2, i * 1.5, 3, 15, false));
        }
      } else {
        projectiles.push(new Projectile(this.x, this.y + this.h/2, 0, 3, 20, false));
      }
      this.shootTimer = 0;
    }
    
    // Phase change - more aggressive
    if (this.hp < this.maxHp * 0.75) this.phase = 2;
    if (this.hp < this.maxHp * 0.5) this.phase = 3;
    if (this.hp < this.maxHp * 0.25) this.phase = 4;
  }
  draw(ctx) {
    ctx.fillStyle = '#ffaa00';
    ctx.fillRect(this.x - this.w/2, this.y - this.h/2, this.w, this.h);
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - 20);
    // HP bar background
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(this.x - this.w/2, this.y - this.h/2 - 12, this.w, 6);
    // HP bar fill
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(this.x - this.w/2, this.y - this.h/2 - 12, (this.hp / this.maxHp) * this.w, 6);
  }
}

class Player {
  constructor() {
    this.x = canvas.width / 2;
    this.y = canvas.height - 60;
    this.w = 30; this.h = 40;
    this.hp = 100;
    this.maxHp = 100;
    this.speed = 6;
    this.vx = 0; this.vy = 0;
    this.fireRate = 8;
    this.shootTimer = 0;
    this.shield = 0;
    this.maxShield = 100;
    this.rapidFireTimer = 0;
    this.spreadFireTimer = 0;
    this.shotgunTimer = 0;
    this.ammo = 100;
    this.maxAmmo = 100;
  }
  handleInput(keys) {
    this.vx = 0;
    this.vy = 0;
    const moveSpeed = this.speed;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.vx = -moveSpeed;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) this.vx = moveSpeed;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) this.vy = -moveSpeed;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) this.vy = moveSpeed;
  }
  update(keys) {
    this.handleInput(keys);
    this.x = Math.max(this.w/2, Math.min(this.x + this.vx, canvas.width - this.w/2));
    this.y = Math.max(60, Math.min(this.y + this.vy, canvas.height - this.h/2));
    
    this.rapidFireTimer--;
    this.spreadFireTimer--;
    this.shotgunTimer--;
    this.shootTimer--;
  }
  shoot(projectiles) {
    if (this.ammo <= 0) return;
    const currentFireRate = this.rapidFireTimer > 0 ? this.fireRate * 0.5 : this.fireRate;
    if (this.shootTimer <= 0) {
      if (this.shotgunTimer > 0) {
        for (let i = -4; i <= 4; i++) {
          const angle = (i * 15) * Math.PI / 180;
          const vx = Math.sin(angle) * 3;
          projectiles.push(new Projectile(this.x + i * 5, this.y - this.h/2, vx, -6, 20));
        }
        this.ammo--;
        this.shootTimer = 25;
      } else if (this.spreadFireTimer > 0) {
        projectiles.push(new Projectile(this.x - 10, this.y - this.h/2, -1, -6, 15));
        projectiles.push(new Projectile(this.x, this.y - this.h/2, 0, -6, 15));
        projectiles.push(new Projectile(this.x + 10, this.y - this.h/2, 1, -6, 15));
        this.ammo--;
        this.shootTimer = currentFireRate;
      } else {
        projectiles.push(new Projectile(this.x, this.y - this.h/2, 0, -6, 15));
        this.ammo--;
        this.shootTimer = currentFireRate;
      }
    }
  }
  draw(ctx) {
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(this.x - this.w/2, this.y - this.h/2, this.w, this.h);
    
    // Shield indicator
    if (this.shield > 0) {
      ctx.strokeStyle = '#00bfff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.w/2 + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  takeDamage(damage) {
    const shieldDmg = Math.min(damage, this.shield);
    this.shield -= shieldDmg;
    const hpDmg = damage - shieldDmg;
    this.hp -= hpDmg;
    return this.hp <= 0;
  }
}

class Game {
  constructor() {
    this.player = new Player();
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.powerUps = [];
    this.boss = null;
    
    this.score = 0;
    this.level = 1;
    this.wave = 1;
    this.gameState = 'welcome'; // welcome, playing, levelUp, gameOver, won
    this.gameOverTimer = 0;
    
    this.keys = {};
    this.waveTimer = 0;
    this.waveEnemyCount = 8 + this.level * 3;
    this.waveEnemiesSpawned = 0;
    this.waveProgress = 0;
    this.ammoSpawnTimer = 0;
    
    window.addEventListener('keydown', e => { 
      this.keys[e.key] = true;
      if (this.gameState === 'welcome') this.startGame();
    });
    window.addEventListener('keyup', e => { this.keys[e.key] = false; });
    window.addEventListener('click', () => {
      if (this.gameState === 'welcome') this.startGame();
    });
    
    this.spawnWave();
    this.run();
  }
  
  startGame() {
    const welcomeScreen = document.getElementById('welcomeScreen');
    welcomeScreen.classList.add('hidden');
    this.gameState = 'playing';
  }
  
  showWinScreen() {
    const screen = document.getElementById('gameOverScreen');
    document.getElementById('gameOverText').textContent = 'CONGRATS!';
    document.getElementById('gameOverStats').textContent = `Final Score: ${Math.floor(this.score)} | Level: ${this.level}`;
    document.getElementById('gameOverMessage').textContent = 'You have finished the Shooter Game of KaziX!';
    screen.classList.add('show');
  }
  
  spawnWave() {
    if (this.level % 5 === 0 && this.wave === 1) {
      // Boss wave
      this.boss = new Boss(this.level / 5);
      this.updateBossHUD();
    } else {
      this.boss = null;
      this.updateBossHUD();
      this.enemies = [];
      this.waveEnemiesSpawned = 0;
      this.waveProgress = 0;
    }
  }
  
  updateBossHUD() {
    const bossHpEl = document.getElementById('boss-hp');
    bossHpEl.style.display = this.boss ? 'block' : 'none';
  }
  
  spawnEnemy() {
    if (this.boss) return;
    if (this.waveEnemiesSpawned >= this.waveEnemyCount) return;
    
    this.waveTimer++;
    const spawnDelay = Math.max(30, 60 - this.level * 5 - this.wave * 3);
    if (this.waveTimer > spawnDelay) {
      const types = ['basic', 'fast', 'heavy', 'sinker'];
      const weights = [Math.max(0.2, 0.5 - this.level * 0.08), 0.3 + this.level * 0.05, 0.2 + this.level * 0.04, 0.15 + this.level * 0.03];
      let rand = Math.random();
      let type = 'basic';
      for (let i = 0; i < weights.length; i++) {
        if (rand < weights[i]) { type = types[i]; break; }
        rand -= weights[i];
      }
      
      const x = Math.random() * (canvas.width - 50) + 25;
      this.enemies.push(new Enemy(x, -30, type, this.level));
      this.waveEnemiesSpawned++;
      this.waveTimer = 0;
    }
  }
  
  spawnAmmoBox() {
    this.ammoSpawnTimer++;
    const spawnDelay = 240; // Spawn ammo less often (~4 seconds)
    if (this.ammoSpawnTimer > spawnDelay) {
      const x = Math.random() * (canvas.width - 50) + 25;
      this.powerUps.push(new PowerUp(x, -30, 'ammo'));
      this.ammoSpawnTimer = 0;
    }
  }
  
  checkCollisions() {
    // Projectile-enemy collision
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.isPlayerProjectile) continue;
      
      if (this.boss) {
        const dx = proj.x - this.boss.x, dy = proj.y - this.boss.y;
        if (Math.abs(dx) < this.boss.w/2 && Math.abs(dy) < this.boss.h/2) {
          this.boss.hp -= proj.damage;
          this.projectiles.splice(i, 1);
          for (let j = 0; j < 5; j++) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push(new Particle(proj.x, proj.y, Math.cos(angle) * 2, Math.sin(angle) * 2, '#ffaa00'));
          }
          if (this.boss.hp <= 0) {
            this.score += 5000;
            this.gameState = 'won';
            this.showWinScreen();
          }
          continue;
        }
      }
      
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const dx = proj.x - enemy.x, dy = proj.y - enemy.y;
        if (Math.abs(dx) < enemy.w/2 && Math.abs(dy) < enemy.h/2) {
          enemy.hp -= proj.damage;
          this.projectiles.splice(i, 1);
          for (let k = 0; k < 3; k++) {
            const angle = Math.random() * Math.PI * 2;
            this.particles.push(new Particle(proj.x, proj.y, Math.cos(angle) * 2, Math.sin(angle) * 2, '#ff4444'));
          }
          if (enemy.hp <= 0) {
            this.score += Math.floor(enemy.score);
            this.enemies.splice(j, 1);
            if (Math.random() < 0.15) {
              const powerUpTypes = ['health', 'rapid_fire', 'spread', 'shotgun', 'shield', 'ammo'];
              this.powerUps.push(new PowerUp(enemy.x, enemy.y, powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]));
            }
            this.waveProgress++;
          }
          break;
        }
      }
    }
    
    // Enemy projectile-player collision
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (proj.isPlayerProjectile) continue;
      
      const dx = proj.x - this.player.x, dy = proj.y - this.player.y;
      if (Math.abs(dx) < this.player.w/2 && Math.abs(dy) < this.player.h/2) {
        if (this.player.takeDamage(proj.damage)) {
          this.gameState = 'gameOver';
          this.gameOverTimer = 180;
        }
        this.projectiles.splice(i, 1);
        for (let j = 0; j < 8; j++) {
          const angle = Math.random() * Math.PI * 2;
          this.particles.push(new Particle(proj.x, proj.y, Math.cos(angle) * 3, Math.sin(angle) * 3, '#ff0000'));
        }
      }
    }
    
    // PowerUp-player collision
    for (let i = this.powerUps.length - 1; i >= 0; i--) {
      const pu = this.powerUps[i];
      const dx = pu.x - this.player.x, dy = pu.y - this.player.y;
      if (Math.abs(dx) < pu.w && Math.abs(dy) < pu.h) {
        if (pu.type === 'health') this.player.hp = Math.min(this.player.hp + 30, this.player.maxHp);
        if (pu.type === 'rapid_fire') this.player.rapidFireTimer = 240;
        if (pu.type === 'spread') this.player.spreadFireTimer = 240;
        if (pu.type === 'shotgun') this.player.shotgunTimer = 300;
        if (pu.type === 'shield') this.player.shield = this.player.maxShield;
        if (pu.type === 'ammo') this.player.ammo = Math.min(this.player.ammo + 100, this.player.maxAmmo);
        this.powerUps.splice(i, 1);
      }
    }
  }
  
  levelUp() {
    this.level++;
    this.wave = 1;
    this.score += 1000;
    this.player.hp = this.player.maxHp;
    this.player.shield = 0;
    this.gameState = 'levelUp';
    setTimeout(() => {
      this.gameState = 'playing';
      this.spawnWave();
    }, 2000);
    document.getElementById('levelUp').classList.add('show');
    setTimeout(() => document.getElementById('levelUp').classList.remove('show'), 2000);
  }
  
  update() {
    if (this.gameState === 'gameOver') {
      this.gameOverTimer--;
      return;
    }
    
    if (this.gameState !== 'playing') return;
    
    this.player.update(this.keys);
    
    if (this.keys[' ']) this.player.shoot(this.projectiles);
    
    this.spawnEnemy();
    this.spawnAmmoBox();
    
    this.enemies.forEach(e => e.update(this.player, this.projectiles, this));
    if (this.boss) this.boss.update(this.projectiles);
    
    this.projectiles.forEach(p => p.update());
    this.projectiles = this.projectiles.filter(p => !p.isOffScreen());
    
    this.powerUps.forEach(pu => pu.update());
    this.powerUps = this.powerUps.filter(pu => !pu.isOffScreen());
    
    this.particles.forEach(p => p.update());
    this.particles = this.particles.filter(p => !p.isDead());
    
    this.enemies = this.enemies.filter(e => !e.isOffScreen());
    
    this.checkCollisions();
    
    // Wave complete check
    if (!this.boss && this.waveEnemiesSpawned >= this.waveEnemyCount && this.enemies.length === 0 && this.projectiles.filter(p => !p.isPlayerProjectile).length === 0) {
      this.wave++;
      if (this.wave > 3) {
        this.levelUp();
      } else {
        this.spawnWave();
      }
    }
  }
  
  draw() {
    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    
    // Draw game objects
    this.particles.forEach(p => p.draw(ctx));
    this.powerUps.forEach(pu => pu.draw(ctx));
    this.enemies.forEach(e => e.draw(ctx));
    if (this.boss) this.boss.draw(ctx);
    this.projectiles.forEach(p => p.draw(ctx));
    this.player.draw(ctx);
    
    // Update HUD
    document.getElementById('score').textContent = `Score: ${Math.floor(this.score)}`;
    document.getElementById('level').textContent = `Level: ${this.level} | Wave: ${this.wave}`;
    document.getElementById('health').textContent = Math.floor(this.player.hp);
    document.getElementById('ammo').textContent = `${this.player.ammo}/${this.player.maxAmmo}`;
    
    if (this.boss) {
      const barLength = Math.floor((this.boss.hp / this.boss.maxHp) * 12);
      document.getElementById('bossHpBar').textContent = '█'.repeat(barLength) + '░'.repeat(12 - barLength);
    }
    
    // Game over screen
    if (this.gameState === 'gameOver') {
      const screen = document.getElementById('gameOverScreen');
      document.getElementById('gameOverText').textContent = 'MISSION FAILED';
      document.getElementById('gameOverStats').textContent = `Final Score: ${Math.floor(this.score)} | Level: ${this.level}`;
      document.getElementById('gameOverMessage').textContent = 'Your ship was destroyed...';
      screen.classList.add('show');
    }
  }
  
  run() {
    const loop = () => {
      this.update();
      this.draw();
      requestAnimationFrame(loop);
    };
    loop();
  }
}

const game = new Game();
window.game = game;