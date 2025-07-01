const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log(`New user connected: ${socket.id}`);

  socket.on("join", (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
    socket.to(room).emit("joined");
  });

  socket.on("offer", (data) => {
    console.log(`Offer received from ${socket.id} for room: ${data.room}`, data);
    socket.to(data.room).emit("offer", data);
  });

  socket.on("answer", (data) => {
    console.log(`Answer received from ${socket.id} for room: ${data.room}`, data);
    socket.to(data.room).emit("answer", data);
  });

  socket.on("ice-candidate", (data) => {
    console.log(`ICE candidate received from ${socket.id} for room: ${data.room}`, data.candidate);
    socket.to(data.room).emit("ice-candidate", data);
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    socket.broadcast.emit("user-left");
  });
});

server.listen(3000, () => {
  console.log("Signaling server running on http://localhost:3000");
});
