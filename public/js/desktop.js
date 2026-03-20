let pc;
let dataChannel;
let offerSent = false;

const session = Math.random().toString(36).substring(2, 8);
document.getElementById("session").textContent = session;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  size: 20,
  speed: 4
};

const controls = {
  up: false,
  down: false,
  left: false,
  right: false
};

let enemies = [];
let score = 0;
let gameOver = false;
let lastSpawnTime = 0;
let lastScoreTime = 0;

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

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  const size = 18;
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
  const speed = 1.5 + Math.random() * 1.5;

  enemies.push({
    x,
    y,
    size,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed
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

function update() {
  if (gameOver) return;

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

  enemies.forEach((enemy) => {
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const distance = Math.hypot(dx, dy);

    if (distance < enemy.size + player.size) {
      gameOver = true;
    }
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "red";
  enemies.forEach((enemy) => {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "white";
  ctx.font = "24px Arial";
  ctx.fillText(`Score: ${score}`, 20, 35);

  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "42px Arial";
    ctx.fillText("Game Over", canvas.width / 2 - 120, canvas.height / 2);

    ctx.font = "24px Arial";
    ctx.fillText("Refresh desktop page to restart", canvas.width / 2 - 145, canvas.height / 2 + 40);
  }
}

function gameLoop(timestamp) {
  if (!lastSpawnTime) lastSpawnTime = timestamp;
  if (!lastScoreTime) lastScoreTime = timestamp;

  if (!gameOver && timestamp - lastSpawnTime > 1200) {
    spawnEnemy();
    lastSpawnTime = timestamp;
  }

  if (!gameOver && timestamp - lastScoreTime > 1000) {
    score += 1;
    lastScoreTime = timestamp;
  }

  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();