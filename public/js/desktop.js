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

const ws = new WebSocket(`ws://192.168.0.224:3000`);

ws.onopen = async () => {
  console.log("Desktop WS open");

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
    console.log("Received control:", message);

    if (message.type === "control") {
      if (message.action in controls) {
        controls[message.action] = message.state === "down";
      }

      if (message.action === "shoot" && message.state === "press") {
        console.log("Shoot pressed");
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
  console.log("Desktop got:", data.type);

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

function update() {
  if (controls.left) player.x -= player.speed;
  if (controls.right) player.x += player.speed;
  if (controls.up) player.y -= player.speed;
  if (controls.down) player.y += player.speed;

  if (player.x < player.size) player.x = player.size;
  if (player.x > canvas.width - player.size) player.x = canvas.width - player.size;
  if (player.y < player.size) player.y = player.size;
  if (player.y > canvas.height - player.size) player.y = canvas.height - player.size;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
  ctx.fill();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();