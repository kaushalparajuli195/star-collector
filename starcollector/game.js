
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Game sound system
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(frequency, duration, type = "sine", volume = 0.15) {
    if (audioCtx.state === "suspended") {
        audioCtx.resume();
    }

    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + duration
    );

    oscillator.connect(gain);
    gain.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

const scoreText = document.getElementById("score");
const livesText = document.getElementById("lives");
const startButton = document.getElementById("startButton");



let player, star, obstacles, trees, zombies;
let score = 0;
let lives = 3;
let shopStars = 0;
let running = false;
let keys = {};
let lastHit = 0;
// Player animation
let animationFrame = 0;
let facing = "down";
let isMoving = false;
let playerDamage = 1;
let playerArmor = 0;
let inventory = [];

const HIT_COOLDOWN = 2000;
const ATTACK_RANGE = 65;
const ATTACK_COOLDOWN = 400;

let lastAttack = 0;
let attackEffect = 0;
// World dimensions
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1000;

// Camera
let camera = {
    x: 0,
    y: 0,
    smoothness: 0.1
};

function resetGame() {
    player = { x: 400, y: 250, size: 18, speed: 4 };
    star = { x: 150, y: 150, size: 12 };

    obstacles = [
        { x: 250, y: 180, size: 22 },
        { x: 550, y: 300, size: 22 },
        { x: 350, y: 400, size: 22 },
        { x: 650, y: 120, size: 22 }
    ];

    
trees = [
    // Original trees
    { x: 100, y: 100 },
    { x: 430, y: 90 },
    { x: 730, y: 220 },
    { x: 120, y: 380 },
    { x: 720, y: 420 },
    { x: 470, y: 450 },

    // New forest area
    { x: 850, y: 100 },
    { x: 1000, y: 180 },
    { x: 1200, y: 120 },
    { x: 1450, y: 200 },
    { x: 900, y: 350 },
    { x: 1100, y: 400 },
    { x: 1350, y: 450 },
    { x: 1550, y: 550 },

    // Southern forest
    { x: 150, y: 650 },
    { x: 350, y: 750 },
    { x: 600, y: 850 },
    { x: 850, y: 700 },
    { x: 1050, y: 900 },
    { x: 1250, y: 750 },
    { x: 1450, y: 850 },

    // Extra scattered trees
    { x: 550, y: 600 },
    { x: 300, y: 550 },
    { x: 950, y: 550 },
    { x: 1150, y: 250 }
];
// Zombie enemies
zombies = [
    { x: 650, y: 400, size: 17, speed: 1.2, health: 3 }
];

score = 30;
shopStars = 330;
lives = 3;
lastHit = 0;
inventory = [];
playerDamage = 1;
playerArmor = 0;
updatePlayerStats();

document.getElementById("shopStars").textContent = shopStars;
    scoreText.textContent = score;
    livesText.textContent = lives;
}

 // Shop item prices
const shopItems = {
    woodenSword: {
        name: "Wooden Sword",
        price: 30,
        damage: 2
    },
    ironSword: {
        name: "Iron Sword",
        price: 75,
        damage: 4
    },
    leatherArmor: {
        name: "Leather Armor",
        price: 40,
        armor: 0.25
    },
    ironArmor: {
        name: "Iron Armor",
        price: 100,
        armor: 0.5
    }
};
// Purchased equipment


function buyItem(itemId) {
    const item = shopItems[itemId];

    if (!item) return;

    if (inventory.includes(itemId)) {
        alert("You already own " + item.name + "!");
        return;
    }

    if (shopStars < item.price) {
        alert("Not enough stars!");
        return;
    }

    // Deduct currency
    shopStars -= item.price;
    score = shopStars;

    // Add equipment
    inventory.push(itemId);
    // Equip the purchased item
    if (item.damage) {
        playerDamage = item.damage;
    }

    if (item.armor) {
        playerArmor = item.armor;
    }
    updatePlayerStats();
    // Update displays
    document.getElementById("shopStars").textContent = shopStars;
    scoreText.textContent = score;

    alert("You purchased " + item.name + "!");
    console.log("Damage:", playerDamage);
    console.log("Armor:", playerArmor);
}



function drawBackground() {
    ctx.fillStyle = "#315c35";
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    ctx.fillStyle = "#477b43";

    for (let x = 20; x < WORLD_WIDTH; x += 80) {
        for (let y = 20; y < WORLD_HEIGHT; y += 80) {
            ctx.fillRect(x, y, 3, 3);
        }
    }
}
function updatePlayerStats() {
    document.getElementById("damageValue").textContent = playerDamage;

    document.getElementById("armorValue").textContent =
        Math.round(playerArmor * 100) + "%";
}




function drawTree(tree) {

    // Tree shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.beginPath();
    ctx.ellipse(tree.x, tree.y + 22, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tree trunk
    ctx.fillStyle = "#79502e";
    ctx.fillRect(tree.x - 7, tree.y - 5, 14, 35);

    // Dark green leaves
    ctx.fillStyle = "#174d28";
    ctx.beginPath();
    ctx.arc(tree.x, tree.y - 15, 28, 0, Math.PI * 2);
    ctx.fill();

    // Middle leaves
    ctx.fillStyle = "#26733a";
    ctx.beginPath();
    ctx.arc(tree.x - 10, tree.y - 23, 17, 0, Math.PI * 2);
    ctx.fill();

    // Light green leaves
    ctx.fillStyle = "#388b42";
    ctx.beginPath();
    ctx.arc(tree.x + 10, tree.y - 20, 16, 0, Math.PI * 2);
    ctx.fill();
}


function drawPlayer() {

    // Walking animation movement
    const bounce = isMoving
        ? Math.abs(Math.sin(animationFrame)) * 3
        : 0;

    const swing = isMoving
        ? Math.sin(animationFrame) * 5
        : 0;

    const px = player.x;
    const py = player.y - bounce;

    // Legs
    ctx.strokeStyle = "#173b64";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(px - 6, py + 8);
    ctx.lineTo(px - 6 + swing, py + 17);
    ctx.moveTo(px + 6, py + 8);
    ctx.lineTo(px + 6 - swing, py + 17);
    ctx.stroke();

    // Arms
    ctx.strokeStyle = "#45b7ff";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(px - 12, py - 3);
    ctx.lineTo(px - 17 - swing * 0.5, py + 7);

    ctx.moveTo(px + 12, py - 3);
    ctx.lineTo(px + 17 + swing * 0.5, py + 7);
    ctx.stroke();

    // Body
    ctx.fillStyle = "#45b7ff";
    ctx.beginPath();
    ctx.arc(px, py, player.size, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "white";

    if (facing === "left") {
        ctx.beginPath();
        ctx.arc(px - 7, py - 4, 3, 0, Math.PI * 2);
        ctx.fill();
    } else if (facing === "right") {
        ctx.beginPath();
        ctx.arc(px + 7, py - 4, 3, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.beginPath();

        if (facing === "up") {
            ctx.arc(px - 6, py - 8, 2, 0, Math.PI * 2);
            ctx.arc(px + 6, py - 8, 2, 0, Math.PI * 2);
        } else {
            ctx.arc(px - 6, py - 5, 3, 0, Math.PI * 2);
            ctx.arc(px + 6, py - 5, 3, 0, Math.PI * 2);
        }

        ctx.fill();
    }
}
function drawZombie(zombie) {

    // Zombie body
    ctx.fillStyle = "#547a42";
    ctx.beginPath();
    ctx.arc(zombie.x, zombie.y, zombie.size, 0, Math.PI * 2);
    ctx.fill();

    // Zombie eyes
    ctx.fillStyle = "#ff3333";

    ctx.beginPath();
    ctx.arc(zombie.x - 6, zombie.y - 5, 3, 0, Math.PI * 2);
    ctx.arc(zombie.x + 6, zombie.y - 5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Zombie mouth
    ctx.fillStyle = "#222222";
    ctx.fillRect(zombie.x - 6, zombie.y + 5, 12, 3);

    // Zombie arms
    ctx.strokeStyle = "#547a42";
    ctx.lineWidth = 5;

    ctx.beginPath();
    ctx.moveTo(zombie.x - 12, zombie.y);
    ctx.lineTo(zombie.x - 22, zombie.y + 8);

    ctx.moveTo(zombie.x + 12, zombie.y);
    ctx.lineTo(zombie.x + 22, zombie.y + 8);

    ctx.stroke();
    // Zombie health bar
    const barWidth = 40;
    const barHeight = 5;

    const healthPercent = Math.max(0, zombie.health / 3);

    ctx.fillStyle = "black";
    ctx.fillRect(
        zombie.x - barWidth / 2,
        zombie.y - zombie.size - 15,
        barWidth,
        barHeight
);

    if (healthPercent > 0.6) {
    ctx.fillStyle = "limegreen";
} else if (healthPercent > 0.3) {
    ctx.fillStyle = "yellow";
} else {
    ctx.fillStyle = "red";
}
    ctx.fillRect(
        zombie.x - barWidth / 2,
        zombie.y - zombie.size - 15,
        barWidth * healthPercent,
        barHeight
);
}

function drawStar() {
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();

    for (let i = 0; i < 10; i++) {
        const angle = i * Math.PI / 5 - Math.PI / 2;
        const radius = i % 2 === 0 ? 14 : 6;

        const x = star.x + Math.cos(angle) * radius;
        const y = star.y + Math.sin(angle) * radius;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }

    ctx.closePath();
    ctx.fill();
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.fillStyle = "#777777";
        ctx.beginPath();
        ctx.arc(obstacle.x, obstacle.y, obstacle.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function checkCollision(a, b, distance) {
    return Math.hypot(a.x - b.x, a.y - b.y) < distance;
}

function damagePlayer() {
    const now = Date.now();

    if (now - lastHit < HIT_COOLDOWN) return;

    lives--;
    livesText.textContent = lives;
    lastHit = now;

    if (lives <= 0) {
        running = false;
        keys = {};

        startButton.textContent = "PLAY AGAIN";

        alert("GAME OVER! Your score: " + score);
    }
}

// Check collision against all trees and rocks
// Circle vs rectangle collision
function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));

    const distance = Math.hypot(
        cx - closestX,
        cy - closestY
    );

    return distance < radius;
}
// Zombie obstacle collision
function isZombieBlocked(x, y, zombie) {

    // Check rocks
    for (const obstacle of obstacles) {
        const distance = Math.hypot(
            x - obstacle.x,
            y - obstacle.y
        );

        if (distance < zombie.size + obstacle.size) {
            return true;
        }
    }

    // Check tree trunks
    for (const tree of trees) {
        if (circleRectCollision(
            x,
            y,
            zombie.size,
            tree.x - 7,
            tree.y - 5,
            14,
            35
        )) {
            return true;
        }
    }

    return false;
}
// Check rocks and tree trunks
function isBlocked(x, y) {

    // Rock collisions
    for (const obstacle of obstacles) {
        if (
            Math.hypot(
                x - obstacle.x,
                y - obstacle.y
            ) < player.size + obstacle.size
        ) {
            return true;
        }
    }

    // Tree trunk collisions only
    for (const tree of trees) {
        if (circleRectCollision(
            x,
            y,
            player.size,
            tree.x - 7,
            tree.y - 5,
            14,
            35
        )) {
            return true;
        }
    }

    return false;
}


// Player movement
function movePlayer() {
    isMoving = false;
    let dx = 0;
    let dy = 0;

    if (keys["ArrowUp"] || keys["w"] || keys["W"]) dy -= player.speed;
    if (keys["ArrowDown"] || keys["s"] || keys["S"]) dy += player.speed;
    if (keys["ArrowLeft"] || keys["a"] || keys["A"]) dx -= player.speed;
    if (keys["ArrowRight"] || keys["d"] || keys["D"]) dx += player.speed;

    let hit = false;

    // Horizontal movement
   const nextX = Math.max(
    player.size,
    Math.min(WORLD_WIDTH - player.size, player.x + dx)
);
    if (!isBlocked(nextX, player.y)) {
        player.x = nextX;
    } else if (dx !== 0) {
        hit = true;
    }

    // Vertical movement
    const nextY = Math.max(
    player.size,
    Math.min(WORLD_HEIGHT - player.size, player.y + dy)
);

    if (!isBlocked(player.x, nextY)) {
        player.y = nextY;
    } else if (dy !== 0) {
        hit = true;
    }

    if (hit) {
        damagePlayer();
    }
    // Check whether the player actually moved
if (dx !== 0 || dy !== 0) {
    isMoving = true;

    // Update facing direction
    if (Math.abs(dx) > Math.abs(dy)) {
        facing = dx > 0 ? "right" : "left";
    } else if (dy !== 0) {
        facing = dy > 0 ? "down" : "up";
    }
}
}

function updateCamera() {
    // Keep the player near the center of the screen
    const targetX = player.x - canvas.width / 2;
    const targetY = player.y - canvas.height / 2;

    // Keep camera inside the world boundaries
    const maxX = WORLD_WIDTH - canvas.width;
    const maxY = WORLD_HEIGHT - canvas.height;

    const limitedX = Math.max(0, Math.min(maxX, targetX));
    const limitedY = Math.max(0, Math.min(maxY, targetY));

    // Smooth camera movement
    camera.x += (limitedX - camera.x) * camera.smoothness;
    camera.y += (limitedY - camera.y) * camera.smoothness;
}

function attackZombie() {
    const now = Date.now();

    // Attack cooldown
    if (now - lastAttack < ATTACK_COOLDOWN) return;

    lastAttack = now;
    attackEffect = 10;
    playSound(180, 0.1, "sawtooth", 0.08);

    // Attack direction
    let attackX = 0;
    let attackY = 0;

    if (facing === "up") attackY = -1;
    if (facing === "down") attackY = 1;
    if (facing === "left") attackX = -1;
    if (facing === "right") attackX = 1;

    for (let i = zombies.length - 1; i >= 0; i--) {
        const zombie = zombies[i];

        const dx = zombie.x - player.x;
        const dy = zombie.y - player.y;

        const distance = Math.hypot(dx, dy);

        // Check whether zombie is in front of player
        const dot = dx * attackX + dy * attackY;

        if (distance <= ATTACK_RANGE && dot > 0) {
            zombie.health -= playerDamage;
            playSound(260, 0.12, "square", 0.08);
            console.log("Zombie health:", zombie.health);

            if (zombie.health <= 0) {
                playSound(520, 0.2, "triangle", 0.12);
    zombies.splice(i, 1);
    

    score += 5;
    scoreText.textContent = score;

    // Spawn a new zombie
    zombies.push({
        x: Math.random() * 1400 + 100,
        y: Math.random() * 800 + 100,
        size: 17,
        speed: 1.2,
        health: 3
    });

    console.log("Zombie defeated! +5 points");
    console.log("A new zombie has spawned!");
}
                break;
        }
    }
}
function updateGame() {
    movePlayer();
    // Zombie AI: chase the player
    zombies.forEach(zombie => {

        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;

        const distance = Math.hypot(dx, dy);

    // Zombie attacks when close to the player
    if (distance < player.size + zombie.size + 5) {
        damagePlayer();
    }

// Zombie movement
    // Zombie movement - stop at the player's edge
    // Improved zombie movement with obstacle avoidance
const stopDistance = player.size + zombie.size;

if (distance > stopDistance && distance > 0) {
    const dirX = dx / distance;
    const dirY = dy / distance;

    const directions = [
        { x: dirX, y: dirY },
        { x: dirX, y: 0 },
        { x: 0, y: dirY },
        { x: -dirY, y: dirX },
        { x: dirY, y: -dirX }
    ];

    let bestDirection = null;
    let bestScore = -Infinity;

    directions.forEach(direction => {
        const nextX = zombie.x + direction.x * zombie.speed;
        const nextY = zombie.y + direction.y * zombie.speed;

        if (!isZombieBlocked(nextX, nextY, zombie)) {
            const score =
                direction.x * dirX +
                direction.y * dirY;

            if (score > bestScore) {
                bestScore = score;
                bestDirection = direction;
            }
        }
    });

    if (bestDirection) {
        zombie.x += bestDirection.x * zombie.speed;
        zombie.y += bestDirection.y * zombie.speed;
    }
}

});

    if (isMoving) {
        animationFrame += 0.2;
    }

    // Update camera position
    updateCamera();

    // Collect stars
if (checkCollision(player, star, player.size + star.size)) {
    playSound(880, 0.12, "sine", 0.12);
    score += 10;
    shopStars += 10;

    playSound(880, 0.12, "sine", 0.12);

    scoreText.textContent = score;
    document.getElementById("shopStars").textContent = shopStars;

        // Heal player when collecting a star
if (lives < 3) {
    lives++;
    livesText.textContent = lives;
}

        star.x = 30 + Math.random() * (WORLD_WIDTH - 60);
        star.y = 30 + Math.random() * (WORLD_HEIGHT - 60);
    }
}




function drawGame() {
    // Clear the screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Move the camera view
    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    // Draw the world
    drawBackground();
    drawStar();
    drawObstacles();

    // Draw zombies
    zombies.forEach(zombie => {
        drawZombie(zombie);
    });

    // Combine player and trees
    let objects = [];

    objects.push({
        type: "player",
        y: player.y
    });

    trees.forEach(tree => {
        objects.push({
            type: "tree",
            y: tree.y + 30,
            object: tree
        });
    });

    // Sort by Y position
    objects.sort((a, b) => a.y - b.y);

    // Draw in depth order
    objects.forEach(obj => {
        if (obj.type === "player") {
            drawPlayer();
            drawPlayerHealthBar();
        } else if (obj.type === "tree") {
            drawTree(obj.object);
        }
    });

    // Restore normal screen coordinates
    ctx.restore();
}



function gameLoop() {
    if (!running) return;

    updateGame();
    
    drawGame();

    if (running) {
        requestAnimationFrame(gameLoop);
    }
}

// Keyboard controls
document.addEventListener("keydown", event => {
    keys[event.key] = true;

    if (event.key.startsWith("Arrow")) {
        event.preventDefault();
    }
});

document.addEventListener("keyup", event => {
    keys[event.key] = false;
});

// Start / restart
startButton.addEventListener("click", () => {
    if (running) return;

    resetGame();
    keys = {};
    running = true;

    startButton.textContent = "GAME RUNNING";

    gameLoop();
});
// Keyboard controls
document.addEventListener("keydown", event => {
    keys[event.key] = true;

    if (event.key.startsWith("Arrow") || event.code === "Space") {
        event.preventDefault();
    }

    if (event.code === "Space" && !event.repeat) {
        attackZombie();
    }
});
function drawPlayerHealthBar() {
    const barWidth = 45;
    const barHeight = 6;

    const healthPercent = lives / 3;

    // Background
    ctx.fillStyle = "black";
    ctx.fillRect(
        player.x - barWidth / 2,
        player.y - player.size - 18,
        barWidth,
        barHeight
    );

    // Health
    ctx.fillStyle = healthPercent > 0.5 ? "limegreen" :
                    healthPercent > 0.25 ? "yellow" : "red";

    ctx.fillRect(
        player.x - barWidth / 2,
        player.y - player.size - 18,
        barWidth * healthPercent,
        barHeight
    );
}
resetGame();
drawGame();




