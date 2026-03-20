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

  if (!text) {
    return res.status(400).send("Missing text");
  }

  try {
    const dataUrl = await QRCode.toDataURL(text);
    res.json({ dataUrl });
  } catch (error) {
    console.error("QR error:", error);
    res.status(500).send("QR error");
  }
});

wss.on("connection", (ws) => {
  let sessionId = null;
  let role = null;

  console.log("New WebSocket connection");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      console.log("Server received:", data.type, data.role || "", data.sessionId || "");

      if (data.type === "join") {
        sessionId = data.sessionId;
        role = data.role;

        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, {
            desktop: null,
            controller: null,
          });
        }

        const session = sessions.get(sessionId);
        session[role] = ws;

        console.log(`${role} joined session ${sessionId}`);

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

      if (!sessionId || !role) {
        console.log("No session or role yet, ignoring message");
        return;
      }

      const session = sessions.get(sessionId);
      if (!session) {
        console.log("Session not found");
        return;
      }

      const target = role === "desktop" ? session.controller : session.desktop;

      if (target && target.readyState === 1) {
        console.log(`Forwarding ${data.type} from ${role} to ${role === "desktop" ? "controller" : "desktop"}`);
        target.send(JSON.stringify(data));
      } else {
        console.log(`No target connected for ${data.type}`);
      }
    } catch (error) {
      console.error("Message handling error:", error);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket closed", role, sessionId);

    if (!sessionId || !role) return;

    const session = sessions.get(sessionId);
    if (!session) return;

    session[role] = null;

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

    if (!session.desktop && !session.controller) {
      sessions.delete(sessionId);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});