let pc;
let channel;

const session = location.pathname.split("/").pop();

document.getElementById("session").textContent = session;

const protocol = location.protocol === "https:" ? "wss" : "ws";
const ws = new WebSocket(`${protocol}://${location.host}`);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    sessionId: session,
    role: "controller"
  }));

  pc = new RTCPeerConnection();

  pc.ondatachannel = (event) => {
    channel = event.channel;

    channel.onopen = () => {
      console.log("Connected to data channel");
    };

    channel.onmessage = (event) => {
      console.log("Message from desktop:", event.data);
    };

    setupControls();
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
    document.getElementById("status").textContent =
      data.desktop ? "Connected" : "Waiting...";
  }

  if (data.type === "offer") {
    await pc.setRemoteDescription(data.offer);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    ws.send(JSON.stringify({
      type: "answer",
      answer
    }));
  }

  if (data.type === "candidate") {
    await pc.addIceCandidate(data.candidate);
  }
};

function sendControl(action, state = "press") {
  if (!channel || channel.readyState !== "open") return;

  const message = {
    type: "control",
    action,
    state
  };

  channel.send(JSON.stringify(message));
}

function bindHoldButton(buttonId, action) {
  const button = document.getElementById(buttonId);

  button.addEventListener("touchstart", (e) => {
    e.preventDefault();
    sendControl(action, "down");
  });

  button.addEventListener("touchend", (e) => {
    e.preventDefault();
    sendControl(action, "up");
  });

  button.addEventListener("mousedown", () => {
    sendControl(action, "down");
  });

  button.addEventListener("mouseup", () => {
    sendControl(action, "up");
  });

  button.addEventListener("mouseleave", () => {
    sendControl(action, "up");
  });
}

function setupControls() {
  bindHoldButton("up", "up");
  bindHoldButton("down", "down");
  bindHoldButton("left", "left");
  bindHoldButton("right", "right");

  const shootButton = document.getElementById("shoot");

  shootButton.addEventListener("click", () => {
    sendControl("shoot", "press");
  });

  shootButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    sendControl("shoot", "press");
  });
}


