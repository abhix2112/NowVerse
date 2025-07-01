const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("New user connected");

  socket.on("join", (room) => {
    socket.join(room);
    socket.to(room).emit("joined");
  });

  socket.on("offer", (data) => {
    socket.to(data.room).emit("offer", data.sdp);
  });

  socket.on("answer", (data) => {
    socket.to(data.room).emit("answer", data.sdp);
  });

  socket.on("ice-candidate", (data) => {
    socket.to(data.room).emit("ice-candidate", data.candidate);
  });
});

server.listen(3000, () => {
  console.log("Signaling server running on http://localhost:3000");
});
