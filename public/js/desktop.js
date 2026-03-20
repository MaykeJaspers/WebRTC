let pc;
let dataChannel;
let offerSent = false;

const session = Math.random().toString(36).substring(2, 8);
document.getElementById("session").textContent = session;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const restartButton = document.getElementById("restart");

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 18,
  speed: 4.2,
  angle: 0
};

const controls = {
  up: false,
  down: false,
  left: false,
  right: false
};

let enemies = [];
let stars = [];
let score = 0;
let gameOver = false;

let lastSpawnTime = 0;
let lastScoreTime = 0;
let lastStarTime = 0;
let startTime = 0;

const ws = new WebSocket(`ws://192.168.0.224:3000`);

ws.onopen = async () => {
  ws.send(JSON.stringify({
    type: "join",
    sessionId: session,
    role: "desktop"
  }));

  pc = new RTCPeerConnection();

  dataChannel = pc.createDataChannel("controls");

  dataChannel.onopen = () => {
    console.log("Data channel open");
  };

  dataChannel.onmessage = (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "control") {
      if (message.action in controls) {
        controls[message.action] = message.state === "down";
      }

      if (message.action === "shoot" && message.state === "press") {
        removeClosestEnemy();
      }
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: "candidate",
        candidate: event.candidate
      }));
    }
  };
};

ws.onmessage = async (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === "status") {
    const connected = !!data.controller;

    document.getElementById("status").textContent =
      connected ? "Connected" : "Waiting...";

    if (connected && !offerSent) {
      offerSent = true;

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ws.send(JSON.stringify({
        type: "offer",
        offer: offer
      }));
    }
  }

  if (data.type === "answer") {
    await pc.setRemoteDescription(data.answer);
  }

  if (data.type === "candidate") {
    await pc.addIceCandidate(data.candidate);
  }
};

const url = `http://192.168.0.224:3000/controller/${session}`;

fetch(`/qr?text=${encodeURIComponent(url)}`)
  .then((r) => r.json())
  .then((data) => {
    const img = document.createElement("img");
    img.src = data.dataUrl;
    document.getElementById("qr").appendChild(img);
  });

function resetGame() {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.angle = 0;

  controls.up = false;
  controls.down = false;
  controls.left = false;
  controls.right = false;

  enemies = [];
  stars = [];
  score = 0;
  gameOver = false;

  lastSpawnTime = 0;
  lastScoreTime = 0;
  lastStarTime = 0;
  startTime = 0;
}

restartButton.addEventListener("click", resetGame);

function getDifficultyMultiplier(timestamp) {
  const seconds = timestamp / 1000;
  return 1 + seconds / 40;
}

function spawnEnemy(timestamp) {
  const side = Math.floor(Math.random() * 4);
  const size = 14 + Math.random() * 10;
  let x;
  let y;

  if (side === 0) {
    x = Math.random() * canvas.width;
    y = -size;
  } else if (side === 1) {
    x = canvas.width + size;
    y = Math.random() * canvas.height;
  } else if (side === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height + size;
  } else {
    x = -size;
    y = Math.random() * canvas.height;
  }

  const angle = Math.atan2(player.y - y, player.x - x);
  const difficulty = getDifficultyMultiplier(timestamp);
  const speed = (1.2 + Math.random() * 1.2) * difficulty;

  enemies.push({
    x,
    y,
    size,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
  });
}

function spawnStar() {
  stars.push({
    x: 30 + Math.random() * (canvas.width - 60),
    y: 30 + Math.random() * (canvas.height - 60),
    size: 8
  });
}

function removeClosestEnemy() {
  if (enemies.length === 0 || gameOver) return;

  let closestIndex = 0;
  let closestDistance = Infinity;

  enemies.forEach((enemy, index) => {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  enemies.splice(closestIndex, 1);
}

function updatePlayerAngle() {
  if (controls.left) player.angle = -Math.PI / 2;
  if (controls.right) player.angle = Math.PI / 2;
  if (controls.up) player.angle = 0;
  if (controls.down) player.angle = Math.PI;
}

function update(timestamp) {
  if (gameOver) return;

  updatePlayerAngle();

  if (controls.left) player.x -= player.speed;
  if (controls.right) player.x += player.speed;
  if (controls.up) player.y -= player.speed;
  if (controls.down) player.y += player.speed;

  if (player.x < player.size) player.x = player.size;
  if (player.x > canvas.width - player.size) player.x = canvas.width - player.size;
  if (player.y < player.size) player.y = player.size;
  if (player.y > canvas.height - player.size) player.y = canvas.height - player.size;

  enemies.forEach((enemy) => {
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
  });

  for (const enemy of enemies) {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);

    if (distance < enemy.size + player.size) {
      gameOver = true;
    }
  }

  stars = stars.filter((star) => {
    const dx = star.x - player.x;
    const dy = star.y - player.y;
    const distance = Math.hypot(dx, dy);

    if (distance < star.size + player.size) {
      score += 5;
      return false;
    }

    return true;
  });
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);

  ctx.beginPath();
  ctx.moveTo(0, -player.size);
  ctx.lineTo(player.size * 0.7, player.size);
  ctx.lineTo(0, player.size * 0.4);
  ctx.lineTo(-player.size * 0.7, player.size);
  ctx.closePath();

  ctx.fillStyle = "white";
  ctx.fill();

  ctx.restore();
}

function drawStars() {
  ctx.fillStyle = "gold";

  stars.forEach((star) => {
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEnemies() {
  ctx.fillStyle = "red";

  enemies.forEach((enemy) => {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHud(timestamp) {
  const survivalSeconds = startTime ? Math.floor((timestamp - startTime) / 1000) : 0;
  const difficulty = getDifficultyMultiplier(timestamp).toFixed(2);

  ctx.fillStyle = "white";
  ctx.font = "22px Arial";
  ctx.fillText(`Score: ${score}`, 20, 35);
  ctx.fillText(`Time: ${survivalSeconds}s`, 20, 65);
  ctx.fillText(`Difficulty: ${difficulty}x`, 20, 95);
}

function drawGameOver() {
  if (!gameOver) return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.font = "42px Arial";
  ctx.fillText("Game Over", canvas.width / 2 - 120, canvas.height / 2);

  ctx.font = "24px Arial";
  ctx.fillText("Press Restart Game", canvas.width / 2 - 105, canvas.height / 2 + 40);
}

function drawBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 35; i++) {
    const x = (i * 47) % canvas.width;
    const y = (i * 83) % canvas.height;
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x, y, 2, 2);
  }
}

function draw(timestamp) {
  drawBackground();
  drawStars();
  drawEnemies();
  drawPlayer();
  drawHud(timestamp);
  drawGameOver();
}

function gameLoop(timestamp) {
  if (!startTime) startTime = timestamp;
  if (!lastSpawnTime) lastSpawnTime = timestamp;
  if (!lastScoreTime) lastScoreTime = timestamp;
  if (!lastStarTime) lastStarTime = timestamp;

  const difficulty = getDifficultyMultiplier(timestamp);
  const spawnDelay = Math.max(350, 1200 / difficulty);

  if (!gameOver && timestamp - lastSpawnTime > spawnDelay) {
    spawnEnemy(timestamp - startTime);
    lastSpawnTime = timestamp;
  }

  if (!gameOver && timestamp - lastScoreTime > 1000) {
    score += 1;
    lastScoreTime = timestamp;
  }

  if (!gameOver && timestamp - lastStarTime > 4000) {
    spawnStar();
    lastStarTime = timestamp;
  }

  update(timestamp);
  draw(timestamp);
  requestAnimationFrame(gameLoop);
}

resetGame();
gameLoop();