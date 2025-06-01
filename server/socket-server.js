// Simple Socket.IO server for chat
const { Server } = require("socket.io");
const http = require("http");

const PORT = process.env.SOCKET_PORT || 4001;

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("Socket.IO server running");
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store userId <-> socketId mapping
const userSocketMap = new Map();

io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap.set(userId, socket.id);
  }

  socket.on("sendMessage", (payload) => {
    // payload: { conversationId, message, toUserId }
    if (payload.toUserId && userSocketMap.has(payload.toUserId)) {
      io.to(userSocketMap.get(payload.toUserId)).emit("newMessage", payload);
    }
    // Also emit to sender for instant feedback
    socket.emit("newMessage", payload);
    // Optionally: emit to all in conversation
    io.emit("conversationUpdated", { conversationId: payload.conversationId });
  });

  socket.on("disconnect", () => {
    if (userId) userSocketMap.delete(userId);
  });
});

server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
