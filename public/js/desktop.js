let pc;
let dataChannel;
let offerSent = false;

const session = Math.random().toString(36).substring(2, 8);

document.getElementById("session").textContent = session;

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
    console.log("Received:", event.data);
  };

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      console.log("Desktop sending candidate");
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

      console.log("Controller connected, creating offer");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("Desktop sending offer");
      ws.send(JSON.stringify({
        type: "offer",
        offer: offer
      }));
    }
  }

  if (data.type === "answer") {
    console.log("Desktop setting remote answer");
    await pc.setRemoteDescription(data.answer);
  }

  if (data.type === "candidate") {
    console.log("Desktop adding candidate");
    await pc.addIceCandidate(data.candidate);
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