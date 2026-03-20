let pc;
let channel;

const session = location.pathname.split("/").pop();

document.getElementById("session").textContent = session;

const ws = new WebSocket(`ws://192.168.0.224:3000`);

ws.onopen = () => {
  console.log("Phone WS open");

  ws.send(JSON.stringify({
    type: "join",
    sessionId: session,
    role: "controller"
  }));

  pc = new RTCPeerConnection();

  pc.ondatachannel = (event) => {
    console.log("Phone received data channel");
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
      console.log("Phone sending candidate");
      ws.send(JSON.stringify({
        type: "candidate",
        candidate: event.candidate
      }));
    }
  };
};

ws.onmessage = async (msg) => {
  const data = JSON.parse(msg.data);
  console.log("Phone got:", data.type);

  if (data.type === "status") {
    document.getElementById("status").textContent =
      data.desktop ? "Connected" : "Waiting...";
  }

  if (data.type === "offer") {
    console.log("Phone setting remote offer");
    await pc.setRemoteDescription(data.offer);

    console.log("Phone creating answer");
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    console.log("Phone sending answer");
    ws.send(JSON.stringify({
      type: "answer",
      answer: answer
    }));
  }

  if (data.type === "candidate") {
    console.log("Phone adding candidate");
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