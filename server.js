const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");
const QRCode = require("qrcode");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3000;

const sessions = new Map();

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/controller/:sessionId", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "controller.html"));
});

app.get("/qr", async (req, res) => {
  const text = req.query.text;

  try {
    const dataUrl = await QRCode.toDataURL(text);
    res.json({ dataUrl });
  } catch {
    res.status(500).send("QR error");
  }
});

wss.on("connection", (ws) => {
  let sessionId = null;
  let role = null;

  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      sessionId = data.sessionId;
      role = data.role;

      if (!sessions.has(sessionId)) {
        sessions.set(sessionId, { desktop: null, controller: null });
      }

      const session = sessions.get(sessionId);
      session[role] = ws;

      if (session.desktop) {
        session.desktop.send(
          JSON.stringify({
            type: "status",
            controller: !!session.controller,
          })
        );
      }

      if (session.controller) {
        session.controller.send(
          JSON.stringify({
            type: "status",
            desktop: !!session.desktop,
          })
        );
      }

      return;
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://192.168.0.224:${PORT}`);
});