const session = Math.random().toString(36).substring(2, 8);

document.getElementById("session").textContent = session;

const ws = new WebSocket(`ws://${location.host}`);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    sessionId: session,
    role: "desktop"
  }));
};

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === "status") {
    document.getElementById("status").textContent =
      data.controller ? "Connected" : "Waiting...";
  }
};

const url = `http://192.168.0.224:3000/controller/${session}`;

fetch(`/qr?text=${encodeURIComponent(url)}`)
  .then(r => r.json())
  .then(data => {
    const img = document.createElement("img");
    img.src = data.dataUrl;
    document.getElementById("qr").appendChild(img);
  });