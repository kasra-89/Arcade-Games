const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const ui = document.getElementById('ui');
const menu = document.getElementById('menu');
const gameOver = document.getElementById('game-over');
const speedDisplay = document.getElementById('speed');
const timerDisplay = document.getElementById('timer');
const bestTimeDisplay = document.getElementById('bestTime');
const lapsDisplay = document.getElementById('laps');
const nitroBar = document.getElementById('nitro-bar');
const finalTimeDisplay = document.getElementById('final-time');
const countdownEl = document.getElementById('countdown');

const CAR_WIDTH = 22;
const CAR_HEIGHT = 44;
const DRIFT_FACTOR = 0.65;
const TOTAL_LAPS = 3;

const CAR_MODELS = {
    'SPEEDSTER': {
        accel: 0.22,
        maxSpeed: 5.2,
        turnSpeed: 0.038,
        brake: 0.50,
        friction: 0.985,
        name: 'The Bolt',
        desc: 'Extreme top speed but heavy handling for the straights.'
    },
    'DRIFTER': {
        accel: 0.19,
        maxSpeed: 4.6,
        turnSpeed: 0.052,
        brake: 0.55,
        friction: 0.982,
        name: 'Slide King',
        desc: 'Agile and responsive. Perfect for technical corners.'
    },
    'TANK': {
        accel: 0.14,
        maxSpeed: 4.0,
        turnSpeed: 0.035,
        brake: 0.75,
        friction: 0.990,
        name: 'Iron Wall',
        desc: 'Unshakable stability. Heavy braking power for aggressive lines.'
    },
    'COBRA': {
        accel: 0.25,
        maxSpeed: 4.8,
        turnSpeed: 0.045,
        brake: 0.52,
        friction: 0.983,
        name: 'Viper Strike',
        desc: 'Quick off the mark with balanced top speed and handling.'
    },
    'TRUCK': {
        accel: 0.12,
        maxSpeed: 3.8,
        turnSpeed: 0.032,
        brake: 0.85,
        friction: 0.993,
        name: 'Behemoth',
        desc: 'Maximum grip and weight. Slow start but unstoppable force.'
    },
    'GHOST': {
        accel: 0.21,
        maxSpeed: 5.8,
        turnSpeed: 0.032,
        brake: 0.40,
        friction: 0.987,
        name: 'Phantom',
        desc: 'Pure speed machine. High skill required to control the drift.'
    }
};

let currentCarModel = 'SPEEDSTER';
let currentCarColor = '#3498db';

let gameState = 'MENU';
let startTime = 0;
let bestTime = localStorage.getItem('bestTime') || Infinity;
let shakeAmount = 0;

if (bestTime !== Infinity && bestTime !== "Infinity") {
    bestTimeDisplay.innerText = parseFloat(bestTime).toFixed(2);
} else {
    bestTimeDisplay.innerText = "-";
}

const waypoints = [
    { x: 100, y: 100 }, { x: 500, y: 80 }, { x: 900, y: 100 },
    { x: 920, y: 350 }, { x: 900, y: 600 }, { x: 500, y: 620 },
    { x: 100, y: 600 }, { x: 80, y: 350 }
];

const particles = [];
const skidMarks = [];
const boosters = [
    { x: 500, y: 70, active: true },
    { x: 920, y: 350, active: true },
    { x: 80, y: 350, active: true },
    { x: 500, y: 630, active: true }
];

const trees = [
    { x: 150, y: 150 }, { x: 850, y: 150 }, { x: 850, y: 550 }, { x: 150, y: 550 },
    { x: 500, y: 350 }, { x: 400, y: 300 }, { x: 600, y: 300 }, { x: 500, y: 400 },
    { x: 20, y: 20 }, { x: 980, y: 20 }, { x: 980, y: 680 }, { x: 20, y: 680 }
];

class Particle {
    constructor(x, y, vx, vy, color, size, life, decay = 1, glow = false) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.color = color; this.size = size; this.life = life; this.maxLife = life;
        this.decay = decay; this.glow = glow;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.98; this.vy *= 0.98;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.save();
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        if (this.glow) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowBlur = this.size * 2;
            ctx.shadowColor = this.color;
        }
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Car {
    constructor(x, y, color, isAI = false, modelKey = 'SPEEDSTER') {
        this.startX = x;
        this.startY = y;
        this.reset(x, y, color, isAI, modelKey);
    }

    reset(x, y, color, isAI, modelKey = 'SPEEDSTER') {
        const stats = CAR_MODELS[modelKey] || CAR_MODELS['SPEEDSTER'];
        this.accel = stats.accel;
        this.maxSpeed = stats.maxSpeed;
        this.turnSpeed = stats.turnSpeed;
        this.brake = stats.brake;
        this.friction = stats.friction;
        
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.speed = 0;
        this.vx = 0;
        this.vy = 0;
        this.color = color;
        this.isAI = isAI;
        this.checkpointPassed = false;
        this.laps = 0;
        this.active = true;
        this.waypointIndex = 0;
        this.nitro = 100;
        this.isBoosting = false;
        this.boostTimer = 0;
    }

    update() {
        if (!this.active || (gameState !== 'RACING' && gameState !== 'COUNTDOWN')) return;

        let power = 0;
        let steering = 0;

        if (!this.isAI) {
            if (keys['ArrowUp'] || keys['w']) power = 1;
            if (keys['ArrowDown'] || keys['s']) power = -0.5;
            if (keys['ArrowLeft'] || keys['a']) steering = -1;
            if (keys['ArrowRight'] || keys['d']) steering = 1;
            if (keys[' ']) power = -1.2; // Handbrake/Hard brake

            this.isBoosting = (keys['CapsLock'] && this.nitro > 0 && power > 0) || this.boostTimer > 0;
            if (this.isBoosting) {
                power *= 1.8;
                if (this.boostTimer > 0) this.boostTimer--;
                else this.nitro -= 1.5;
                
                // Fancy Nitro Particles
                this.createSparks(2, '#3498db');
                if (Math.random() > 0.8) this.createSparks(1, '#f1c40f');
            } else if (this.nitro < 100) {
                this.nitro += 0.08;
            }
        } else {
            const target = waypoints[this.waypointIndex];
            if (target) {
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const angleToTarget = Math.atan2(dx, -dy);
                
                let angleDiff = angleToTarget - this.angle;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                
                if (Math.abs(angleDiff) > 0.05) {
                    steering = (angleDiff > 0 ? 1 : -1);
                }

                power = Math.abs(angleDiff) < 0.4 ? 0.75 : 0.45;
                if (Math.abs(angleDiff) > 1.2) power = -0.15;

                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 80) this.waypointIndex = (this.waypointIndex + 1) % waypoints.length;
            }
        }

        if (Math.abs(this.speed) > 0.1) {
            const dir = this.speed > 0 ? 1 : -1;
            this.angle += steering * this.turnSpeed * dir * (Math.abs(this.speed) / this.maxSpeed + 0.5);
        }

        if (power > 0) this.speed += power * this.accel;
        else if (power < 0) this.speed += power * this.brake;
        this.speed *= this.friction;

        const currentMax = this.isBoosting ? this.maxSpeed * 1.5 : this.maxSpeed;
        if (this.speed > currentMax) this.speed -= 0.1;
        if (Math.abs(this.speed) < 0.05) this.speed = 0;

        const targetVX = Math.sin(this.angle) * this.speed;
        const targetVY = -Math.cos(this.angle) * this.speed;
        this.vx += (targetVX - this.vx) * (1 - DRIFT_FACTOR);
        this.vy += (targetVY - this.vy) * (1 - DRIFT_FACTOR);

        const nextX = this.x + this.vx;
        const nextY = this.y + this.vy;

        if (checkWallCollision(nextX, nextY)) {
            this.speed *= -0.5;
            this.vx *= -0.4;
            this.vy *= -0.4;
            this.createSmoke(8, '#fff'); 
            if (!this.isAI) shakeAmount = Math.max(shakeAmount, 6);
        } else {
            this.x = nextX;
            this.y = nextY;
        }

        if (!this.isAI) {
            boosters.forEach(b => {
                const dist = Math.sqrt((this.x - b.x)**2 + (this.y - b.y)**2);
                if (dist < 40) {
                    this.boostTimer = 60;
                    this.nitro = Math.min(100, this.nitro + 20);
                }
            });
        }

        const slide = Math.sqrt((targetVX-this.vx)**2 + (targetVY-this.vy)**2);
        if (slide > 2 && Math.abs(this.speed) > 3) {
            this.createSkidMark();
            if (Math.random() > 0.5) this.createSmoke(1);
        }

        if (this.x > 450 && this.x < 550 && this.y > 60 && this.y < 120) this.checkpointPassed = true;
        if (this.checkpointPassed && this.x > 50 && this.x < 150 && this.y > 300 && this.y < 450) {
            this.onLapComplete();
        }
    }

    createSmoke(count, color = 'rgba(200,200,200,0.5)') {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(
                this.x - Math.sin(this.angle) * 15,
                this.y + Math.cos(this.angle) * 15,
                (Math.random() - 0.5) * 1,
                (Math.random() - 0.5) * 1,
                color,
                Math.random() * 5 + 3,
                Math.random() * 20 + 20,
                0.5
            ));
        }
    }

    createSparks(count, color = '#f1c40f') {
        const backX = this.x - Math.sin(this.angle) * 20;
        const backY = this.y + Math.cos(this.angle) * 20;
        for (let i = 0; i < count; i++) {
            const va = this.angle + Math.PI + (Math.random() - 0.5) * 0.8;
            const vs = Math.random() * 5 + 3;
            particles.push(new Particle(
                backX, backY,
                Math.sin(va) * vs,
                -Math.cos(va) * vs,
                color,
                Math.random() * 2 + 1,
                Math.random() * 10 + 10,
                0.8,
                true 
            ));
        }
    }

    createSkidMark() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const ox = cos * 8;
        const oy = sin * 8;
        skidMarks.push({ x1: this.x - ox, y1: this.y - oy, x2: this.x + ox, y2: this.y + oy, life: 180 });
    }

    onLapComplete() {
        this.laps++;
        this.checkpointPassed = false;
        if (!this.isAI) {
            lapsDisplay.innerText = this.laps;
            showLapMessage("LAP " + this.laps + " COMPLETE!");
            shakeAmount = 4; // celebratory shake
            if (this.laps >= TOTAL_LAPS) finishRace("PLAYER");
        } else {
            if (this.laps >= TOTAL_LAPS) finishRace("AI");
        }
    }

    draw() {
        // Road Reflection (Flipped)
        ctx.save();
        ctx.translate(this.x, this.y + 10); // Offset to be under car
        ctx.scale(1, -0.4); // Squash and flip
        ctx.rotate(this.angle);
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = '#000';
        ctx.fillRect(-CAR_WIDTH/2, -CAR_HEIGHT/2, CAR_WIDTH, CAR_HEIGHT);
        ctx.restore();

        // Neon Underglow
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(-CAR_WIDTH/2 - 2, -CAR_HEIGHT/2, CAR_WIDTH + 4, CAR_HEIGHT);
        ctx.restore();

        // Headlights Lighting Beam
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        const headlightGrad = ctx.createRadialGradient(0, -25, 5, 0, -150, 80);
        headlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        headlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = headlightGrad;
        ctx.beginPath();
        ctx.moveTo(-10, -20);
        ctx.lineTo(-40, -180);
        ctx.lineTo(40, -180);
        ctx.lineTo(10, -20);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Shadow 
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-CAR_WIDTH/2 + 6, -CAR_HEIGHT/2 + 6, CAR_WIDTH, CAR_HEIGHT);
        ctx.shadowBlur = 0;

        // Tires with spinning effect
        const wheelSpin = (Date.now() / 20) * (this.speed / this.maxSpeed);
        const drawWheel = (wx, wy) => {
            ctx.save();
            ctx.translate(wx, wy);
            ctx.fillStyle = '#111';
            ctx.fillRect(-3, -5, 6, 10);
            // Spokes/Spin line
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -4);
            ctx.lineTo(0, 4);
            ctx.stroke();
            ctx.restore();
        };
        drawWheel(-CAR_WIDTH/2 - 1, -CAR_HEIGHT/2 + 10);
        drawWheel(CAR_WIDTH/2 - 1, -CAR_HEIGHT/2 + 10);
        drawWheel(-CAR_WIDTH/2 - 1, CAR_HEIGHT/2 - 10);
        drawWheel(CAR_WIDTH/2 - 1, CAR_HEIGHT/2 - 10);

        // Body with dynamic specular highlight based on sun (100, 100)
        const dx = 100 - this.x;
        const dy = 100 - this.y;
        const angleToSun = Math.atan2(dy, dx) - this.angle;
        const specX = Math.cos(angleToSun) * 5;
        const specY = Math.sin(angleToSun) * 5;

        const carGrad = ctx.createRadialGradient(specX, specY, 5, 0, 0, 30);
        carGrad.addColorStop(0, '#fff');
        carGrad.addColorStop(0.2, this.color);
        carGrad.addColorStop(1, '#000');
        
        ctx.fillStyle = carGrad;
        ctx.fillRect(-CAR_WIDTH/2, -CAR_HEIGHT/2, CAR_WIDTH, CAR_HEIGHT);

        // Body outline/pinstripe
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-CAR_WIDTH/2, -CAR_HEIGHT/2, CAR_WIDTH, CAR_HEIGHT);

        // Nitro Flame Glow
        if (this.isBoosting) {
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#3498db';
            ctx.fillStyle = '#3498db';
            ctx.beginPath();
            ctx.moveTo(-CAR_WIDTH/4, CAR_HEIGHT/2);
            ctx.lineTo(0, CAR_HEIGHT/2 + 25 + Math.random()*10);
            ctx.lineTo(CAR_WIDTH/4, CAR_HEIGHT/2);
            ctx.fill();
            
            ctx.shadowColor = '#f1c40f';
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath();
            ctx.moveTo(-CAR_WIDTH/6, CAR_HEIGHT/2);
            ctx.lineTo(0, CAR_HEIGHT/2 + 15);
            ctx.lineTo(CAR_WIDTH/6, CAR_HEIGHT/2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Backfire sparks
            if (Math.random() > 0.7) this.createSparks(2, '#ff4757');
        }

        // Headlights (Xenon style)
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00d2ff';
        ctx.fillRect(-CAR_WIDTH/2 + 2, -CAR_HEIGHT/2, 5, 4);
        ctx.fillRect(CAR_WIDTH/2 - 7, -CAR_HEIGHT/2, 5, 4);
        ctx.shadowBlur = 0;

        // Taillights (LED style)
        ctx.fillStyle = '#ff4757';
        if (this.speed < 0 || (keys['s'] && !this.isAI) || keys[' ']) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff4757';
        }
        ctx.fillRect(-CAR_WIDTH/2 + 2, CAR_HEIGHT/2 - 3, 5, 3);
        ctx.fillRect(CAR_WIDTH/2 - 7, CAR_HEIGHT/2 - 3, 5, 3);
        ctx.shadowBlur = 0;

        // Spoiler (Carbon Fiber look)
        ctx.fillStyle = '#111';
        ctx.fillRect(-CAR_WIDTH/2 - 5, CAR_HEIGHT/2 - 8, CAR_WIDTH + 10, 5);
        ctx.fillStyle = '#222';
        ctx.fillRect(-CAR_WIDTH/2 - 5, CAR_HEIGHT/2 - 8, (CAR_WIDTH + 10)/2, 5);

        // Windshield and Cabin
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(-CAR_WIDTH/2 + 3, -CAR_HEIGHT/2 + 8, CAR_WIDTH - 6, 15);
        
        // Cabin Glass Reflection
        const glassGrad = ctx.createLinearGradient(0, -10, 10, 10);
        glassGrad.addColorStop(0, '#1e272e');
        glassGrad.addColorStop(0.5, '#485460');
        glassGrad.addColorStop(1, '#1e272e');
        ctx.fillStyle = glassGrad;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(-CAR_WIDTH/2 + 4, -CAR_HEIGHT/2 + 9, CAR_WIDTH - 8, 12);
        
        // Specular on glass
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.moveTo(-CAR_WIDTH/2 + 6, -CAR_HEIGHT/2 + 10);
        ctx.lineTo(CAR_WIDTH/2 - 6, -CAR_HEIGHT/2 + 10);
        ctx.lineTo(-CAR_WIDTH/2 + 6, -CAR_HEIGHT/2 + 15);
        ctx.fill();
        ctx.globalAlpha = 1;
        
        ctx.restore();
    }
}

const playerCar = new Car(100, 420, '#3498db');
const aiCars = [
    new Car(130, 420, '#e74c3c', true, 'DRIFTER'),
    new Car(70, 420, '#f1c40f', true, 'TANK')
];

const keys = {};
window.addEventListener('keydown', e => { keys[e.key] = true; });
window.addEventListener('keyup', e => { keys[e.key] = false; });

window.selectModel = (model) => {
    currentCarModel = model;
    document.querySelectorAll('.model-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${model}`).classList.add('active');
    
    // Update player car for live preview
    playerCar.reset(playerCar.x, playerCar.y, currentCarColor, false, model);
    
    // Update Stats Display
    const s = CAR_MODELS[model];
    document.getElementById('stat-name').innerText = s.name;
    document.getElementById('stat-desc').innerText = s.desc;
    document.getElementById('bar-speed').style.width = (s.maxSpeed / 5.8 * 100) + '%';
    document.getElementById('bar-accel').style.width = (s.accel / 0.25 * 100) + '%';
    document.getElementById('bar-handle').style.width = (s.turnSpeed / 0.052 * 100) + '%';
};

window.selectColor = (color) => {
    currentCarColor = color;
    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
    const id = color.replace('#', '');
    const el = document.getElementById(`color-${id}`);
    if (el) el.classList.add('active');
    
    playerCar.color = color;
};

window.startGame = function() {
    gameState = 'COUNTDOWN';
    menu.style.display = 'none';
    gameOver.style.display = 'none';
    ui.style.display = 'none';
    countdownEl.style.display = 'flex';
    
    playerCar.reset(100, 420, currentCarColor, false, currentCarModel);
    aiCars.forEach((ai, i) => {
        const models = Object.keys(CAR_MODELS);
        const randomModel = models[Math.floor(Math.random() * models.length)];
        ai.reset(130 - (i*30), 420, ai.color, true, randomModel);
    });
    
    let count = 3;
    countdownEl.innerText = count;
    const interval = setInterval(() => {
        count--;
        if (count === 0) {
            clearInterval(interval);
            countdownEl.innerText = 'GO!';
            setTimeout(() => {
                countdownEl.style.display = 'none';
                ui.style.display = 'block';
                gameState = 'RACING';
                startTime = Date.now();
                lapsDisplay.innerText = "0";
            }, 800);
        } else {
            countdownEl.innerText = count;
        }
    }, 1000);
    
    skidMarks.length = 0;
    particles.length = 0;
};

window.finishRace = function(winner) {
    if (gameState !== 'RACING') return;
    gameState = 'FINISHED';
    const finalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    finalTimeDisplay.innerText = finalTime;
    
    const resultTitle = document.getElementById('result-title');
    if (winner === "PLAYER") {
        resultTitle.innerText = "YOU WIN!";
        resultTitle.style.color = "#2ecc71";
        if (finalTime < bestTime || bestTime === Infinity) {
            bestTime = finalTime;
            localStorage.setItem('bestTime', bestTime);
            bestTimeDisplay.innerText = bestTime;
        }
    } else {
        resultTitle.innerText = "AI WINS!";
        resultTitle.style.color = "#e74c3c";
    }
    ui.style.display = 'none';
    gameOver.style.display = 'flex';
};

function checkWallCollision(x, y) {
    if (x < 40 || x > 960 || y < 40 || y > 660) return true;
    if (x > 220 && x < 780 && y > 180 && y < 520) return true;
    return false;
}

function showLapMessage(msg) {
    const el = document.getElementById('lap-message');
    if (!el) return;
    el.innerText = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

function update() {
    if (gameState !== 'RACING') return;
    playerCar.update();
    aiCars.forEach(ai => ai.update());

    // Speed Lines Effect
    if (playerCar.speed > playerCar.maxSpeed * 1.05) {
        for(let i=0; i<3; i++) {
            particles.push(new Particle(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                0, 0, 'rgba(255,255,255,0.1)', 1, 20
            ));
        }
    }

    const all = [playerCar, ...aiCars];
    for(let i=0; i<all.length; i++) {
        for(let j=i+1; j<all.length; j++) {
            if (all[i].isAI && all[j].isAI) continue;
            const dx = all[j].x - all[i].x, dy = all[j].y - all[i].y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < 28) {
                const angle = Math.atan2(dy, dx);
                const force = (28-dist)/1.5;
                all[i].vx -= Math.cos(angle) * force; all[i].vy -= Math.sin(angle) * force;
                all[j].vx += Math.cos(angle) * force; all[j].vy += Math.sin(angle) * force;
                all[i].speed *= 0.6; all[j].speed *= 0.6;
            }
        }
    }

    for(let i=particles.length-1; i>=0; i--) {
        particles[i].update();
        if(particles[i].life <= 0) particles.splice(i, 1);
    }
    for(let i=skidMarks.length-1; i>=0; i--) {
        skidMarks[i].life--;
        if(skidMarks[i].life <= 0) skidMarks.splice(i, 1);
    }

    if (speedDisplay) speedDisplay.innerText = Math.round(Math.abs(playerCar.speed) * 35);
    if (nitroBar) nitroBar.style.width = playerCar.nitro + '%';
    if (timerDisplay) timerDisplay.innerText = ((Date.now() - startTime) / 1000).toFixed(2);
}

const grassTufts = [];
for (let i = 0; i < 150; i++) {
    grassTufts.push({
        x: Math.random() * 1000,
        y: Math.random() * 700,
        size: Math.random() * 5 + 2,
        opacity: Math.random() * 0.3 + 0.1
    });
}

const roadCracks = [];
for (let i = 0; i < 30; i++) {
    roadCracks.push({
        x: Math.random() * 920 + 40,
        y: Math.random() * 620 + 40,
        points: Array.from({ length: 4 }, () => ({ dx: Math.random() * 10 - 5, dy: Math.random() * 10 - 5 }))
    });
}

function drawTrack() {
    // Fill background with deep grass
    ctx.fillStyle = '#0a2e0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grass details 
    ctx.fillStyle = '#1b5e20';
    grassTufts.forEach(t => {
        if (checkWallCollision(t.x, t.y)) {
            ctx.beginPath();
            ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Draw track foundation (Base concrete)
    ctx.fillStyle = '#34495e'; 
    ctx.fillRect(32, 32, 936, 636);
    ctx.fillRect(212, 172, 576, 356);

    // Track Surface (Textured Asphalt)
    ctx.fillStyle = '#212f3d'; 
    ctx.fillRect(40, 40, 920, 620);
    ctx.fillStyle = '#0a2e0a'; // Inside field
    ctx.fillRect(220, 180, 560, 340);

    // Track Safety Barriers (Outer)
    ctx.strokeStyle = '#95a5a6';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 940, 640);
    // Barrier supports
    ctx.fillStyle = '#7f8c8d';
    for(let i=30; i<970; i+=60) {
        ctx.fillRect(i-2, 28, 4, 6);
        ctx.fillRect(i-2, 666, 4, 6);
    }

    // Subtle grain on asphalt
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for(let i=0; i<150; i++) {
        const ax = 40 + Math.random()*920;
        const ay = 40 + Math.random()*620;
        if (!checkWallCollision(ax, ay)) ctx.fillRect(ax, ay, 2, 2);
    }

    // Road Cracks (only on track)
    ctx.strokeStyle = '#1b2631';
    ctx.lineWidth = 1;
    roadCracks.forEach(c => {
        if (!checkWallCollision(c.x, c.y)) {
            ctx.beginPath();
            ctx.moveTo(c.x, c.y);
            let px = c.x, py = c.y;
            c.points.forEach(p => {
                px += p.dx; py += p.dy;
                ctx.lineTo(px, py);
            });
            ctx.stroke();
        }
    });

    const drawStripedLine = (x, y, w, h, vert) => {
        ctx.save();
        ctx.translate(x, y);
        const len = vert ? h : w;
        for(let i=0; i<len; i+=30) {
            // High quality curbing with depth
            ctx.fillStyle = (i/30)%2===0 ? '#ecf0f1' : '#e74c3c';
            if(vert) {
                ctx.fillRect(-8, i, 8, 30);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(-8, i+28, 8, 2); // shadow
            } else {
                ctx.fillRect(i, -8, 30, 8);
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(i+28, -8, 2, 8); // shadow
            }
        }
        ctx.restore();
    }
    // Track borders (Curbing)
    drawStripedLine(40,40,920,4,false);
    drawStripedLine(40,660,920,4,false);
    drawStripedLine(40,40,4,620,true);
    drawStripedLine(960,40,4,620,true);
    
    drawStripedLine(220,180,560,4,false);
    drawStripedLine(220,520,560,4,false);
    drawStripedLine(220,180,4,340,true);
    drawStripedLine(780,180,4,340,true);

    // Crowds / Spectators (Colored dots)
    const drawCrowd = (x, y, w, h) => {
        for(let i=0; i<w; i+=8) {
            for(let j=0; j<h; j+=8) {
                ctx.fillStyle = `hsl(${Math.random()*360}, 50%, 50%)`;
                ctx.beginPath(); ctx.arc(x+i, y+j, 2, 0, Math.PI*2); ctx.fill();
            }
        }
    };
    drawCrowd(380, 5, 200, 20); // Top stand
    drawCrowd(380, 675, 200, 20); // Bottom stand

    boosters.forEach(b => {
        ctx.save();
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#fbc531';
        ctx.fillStyle = '#fbc531';
        ctx.beginPath(); ctx.arc(b.x, b.y, 18, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
        
        // Glow pulse ring
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(b.x, b.y, 18 + (Date.now()/10 % 20), 0, Math.PI*2); ctx.stroke();
        
        // Arrow pulse
        const pulse = Math.sin(Date.now() / 150) * 4;
        ctx.strokeStyle = '#2f3640'; ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.beginPath(); 
        ctx.moveTo(b.x-10, b.y+6+pulse); 
        ctx.lineTo(b.x, b.y-6+pulse); 
        ctx.lineTo(b.x+10, b.y+6+pulse); 
        ctx.stroke();
        ctx.restore();
    });

    // Finish Line (Normal Full Width)
    ctx.save();
    const squareSize = 20;
    const startX = 40;
    const endX = 220;
    const baseY = 360; 
    for(let j=0; j<2; j++) {
        for(let i=0; i<9; i++) {
            ctx.fillStyle = (i+j)%2===0 ? '#ffffff' : '#111111';
            ctx.fillRect(startX + i*squareSize, baseY + j*squareSize, squareSize, squareSize);
        }
    }
    ctx.restore();

    trees.forEach(t => {
        // Long Shadow from top-left sun
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.translate(t.x, t.y);
        ctx.rotate(Math.PI / 4);
        ctx.beginPath(); 
        ctx.ellipse(35, 0, 50, 15, 0, 0, Math.PI * 2); 
        ctx.fill();
        ctx.restore();

        // High detail trees
        ctx.fillStyle = '#062c06';
        ctx.beginPath(); ctx.arc(t.x, t.y, 20, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#1b5e20';
        ctx.beginPath(); ctx.arc(t.x-4, t.y-4, 15, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#2e7d32';
        ctx.beginPath(); ctx.arc(t.x-7, t.y-7, 10, 0, Math.PI*2); ctx.fill();
    });
}

function drawMiniMap() {
    ctx.save();
    ctx.translate(canvas.width - 160, canvas.height - 120);
    
    // Glass effect background
    ctx.fillStyle = 'rgba(25, 42, 58, 0.7)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 150, 110, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    for(let i=0; i<150; i+=15) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 110); ctx.stroke(); }
    for(let i=0; i<110; i+=15) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(150, i); ctx.stroke(); }

    ctx.globalAlpha = 1;
    const scale = 0.14;
    ctx.scale(scale, scale);
    ctx.translate(10, 10);

    // Track path on minimap
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)';
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, 920, 620);
    ctx.strokeRect(220, 180, 560, 340);

    // Players on minimap
    const drawDot = (car, color, size = 15, glow=false) => {
        ctx.save();
        if (glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
        }
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(car.x, car.y, size, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    };
    
    aiCars.forEach(ai => drawDot(ai, ai.color, 25));
    drawDot(playerCar, '#3498db', 35, true);
    
    ctx.restore();
}

function drawVignette() {
    const vGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 200, canvas.width / 2, canvas.height / 2, 700);
    vGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vGrad.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function animate() {
    update();
    
    ctx.save();
    if (shakeAmount > 0) {
        ctx.translate((Math.random()-0.5)*shakeAmount, (Math.random()-0.5)*shakeAmount);
        shakeAmount *= 0.92;
        if (shakeAmount < 0.1) shakeAmount = 0;
    }

    drawTrack();
    
    // Ambient Light Source (Sun)
    ctx.save();
    const sunX = 100, sunY = 100;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 800);
    sunGrad.addColorStop(0, 'rgba(255, 255, 200, 0.2)');
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0,0,canvas.width, canvas.height);
    
    // Sun Flare
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255, 255, 200, 0.4)';
    ctx.beginPath(); ctx.arc(sunX, sunY, 40, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 2;
    skidMarks.forEach(s => {
        ctx.globalAlpha = Math.max(0, s.life / 180);
        ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Heat Haze or Fast Motion Blur (only if going very fast)
    if (Math.abs(playerCar.speed) > playerCar.maxSpeed * 1.25) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.drawImage(canvas, (Math.random()-0.5)*2, (Math.random()-0.5)*2);
        ctx.restore();
    }

    particles.forEach(p => p.draw(ctx));
    playerCar.draw();
    aiCars.forEach(ai => ai.draw());

    drawVignette();
    ctx.restore();
    
    if (gameState === 'RACING') {
        drawMiniMap();
    }
    
    requestAnimationFrame(animate);
}
animate();
