const session = location.pathname.split("/").pop();

document.getElementById("session").textContent = session;

const ws = new WebSocket(`ws://${location.host}`);

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "join",
    sessionId: session,
    role: "controller"
  }));
};

ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === "status") {
    document.getElementById("status").textContent =
      data.desktop ? "Connected" : "Waiting...";
  }
};