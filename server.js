 const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Simpan data drawing di memory (dalam produksi gunakan database)
let drawings = [];
let users = 0;

io.on('connection', (socket) => {
  users++;
  io.emit('userCount', users);
  
  // Kirim data drawing yang sudah ada
  socket.emit('loadDrawings', drawings);
  
  // Terima drawing baru
  socket.on('draw', (data) => {
    drawings.push(data);
    socket.broadcast.emit('draw', data);
  });
  
  // Clear canvas
  socket.on('clear', () => {
    drawings = [];
    io.emit('clear');
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    users--;
    io.emit('userCount', users);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
