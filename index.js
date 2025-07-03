// Server-side socket.io handler
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store room information
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('[SERVER] User connected:', socket.id);
  
  socket.on('join', (room) => {
    console.log('[SERVER] User joining room:', room, 'Socket:', socket.id);
    
    // Leave any existing rooms
    socket.rooms.forEach(existingRoom => {
      if (existingRoom !== socket.id) {
        socket.leave(existingRoom);
      }
    });
    
    // Join the new room
    socket.join(room);
    
    // Get current room info
    if (!rooms.has(room)) {
      rooms.set(room, {
        users: [],
        initiator: null
      });
    }
    
    const roomInfo = rooms.get(room);
    
    // Add user to room
    if (!roomInfo.users.includes(socket.id)) {
      roomInfo.users.push(socket.id);
      
      // First user becomes initiator
      if (roomInfo.users.length === 1) {
        roomInfo.initiator = socket.id;
      }
    }
    
    const isFirst = roomInfo.initiator === socket.id;
    
    console.log('[SERVER] Room info:', {
      room,
      users: roomInfo.users.length,
      initiator: roomInfo.initiator,
      isFirst
    });
    
    // Send join confirmation
    socket.emit('joined', { isFirst, userCount: roomInfo.users.length });
    
    // If this is the second user, notify the first user
    if (roomInfo.users.length === 2) {
      socket.to(room).emit('user-joined', { userId: socket.id });
      console.log('[SERVER] Notified initiator of second user');
    } else if (roomInfo.users.length > 2) {
      // Don't allow more than 2 users
      socket.emit('room-full');
      socket.leave(room);
      roomInfo.users = roomInfo.users.filter(id => id !== socket.id);
      return;
    }
  });
  
  socket.on('offer', (data) => {
    console.log('[SERVER] Forwarding offer to room:', data.room);
    socket.to(data.room).emit('offer', data);
  });
  
  socket.on('answer', (data) => {
    console.log('[SERVER] Forwarding answer to room:', data.room);
    socket.to(data.room).emit('answer', data);
  });
  
  socket.on('ice-candidate', (data) => {
    console.log('[SERVER] Forwarding ICE candidate to room:', data.room);
    socket.to(data.room).emit('ice-candidate', data);
  });
  
  socket.on('leave', (room) => {
    console.log('[SERVER] User leaving room:', room, 'Socket:', socket.id);
    handleUserLeave(socket, room);
  });
  
  socket.on('disconnect', () => {
    console.log('[SERVER] User disconnected:', socket.id);
    
    // Clean up all rooms this user was in
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        handleUserLeave(socket, room);
      }
    });
  });
  
  function handleUserLeave(socket, room) {
    const roomInfo = rooms.get(room);
    if (roomInfo) {
      // Remove user from room
      roomInfo.users = roomInfo.users.filter(id => id !== socket.id);
      
      // Notify other users
      socket.to(room).emit('user-left', { userId: socket.id });
      
      // If room is empty, delete it
      if (roomInfo.users.length === 0) {
        rooms.delete(room);
        console.log('[SERVER] Room deleted:', room);
      } else {
        // If the initiator left, make the remaining user the initiator
        if (roomInfo.initiator === socket.id && roomInfo.users.length > 0) {
          roomInfo.initiator = roomInfo.users[0];
          console.log('[SERVER] New initiator:', roomInfo.initiator);
        }
      }
    }
    
    socket.leave(room);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`[SERVER] Running on port ${PORT}`);
});
