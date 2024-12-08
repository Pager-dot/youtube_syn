const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  methods: ["GET", "POST"],
}));

const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 4000;
const rooms = new Map();

const generateRoomId = () => {
  return Math.random().toString(36).substr(2, 4).toUpperCase();  // Generate 8-character room ID
};

app.post('/create-room', (req, res) => {
  const roomId = generateRoomId();
  console.log("thank you for creating a room and your roomId is here: : ", roomId);

  const { url } = req.body;
  console.log("and your youtube link is: ", url);
  
  rooms.set(roomId, {
    url,
    users: new Set(),
  });
  
  res.json({ roomId, url });
});

app.post('/join-room', (req, res) => {
  const { roomId } = req.body;

  console.log("joining room id ",roomId)

  
  if (!rooms.has(roomId)) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  const room = rooms.get(roomId);
  console.log("thank you for joing a roomiD : ", rooms.get(roomId));
  console.log("with url: : ", room.url);
  
  res.json({ roomId, url: room.url });
});

io.on('connection', (socket) => {
  let currentRoom = null;

  socket.on('joinRoom', ({ roomId, url }) => {
    if (!rooms.has(roomId)) return;

    console.log("hi you cliend id is: ",socket.id.slice(0, 4));
    console.log("and url is: ", url);

    currentRoom = roomId;
    socket.join(roomId);
    
    const room = rooms.get(roomId);
    room.users.add(socket.id);
    
    io.to(roomId).emit('roomUsers', Array.from(room.users));
  });

  socket.on('syncVideo', ({ roomId, time, playbackSpeed }) => {
    if (!rooms.has(roomId)) return;
    console.log("this SynViedo ok: ", roomId,time,  playbackSpeed);
    const room = rooms.get(roomId);
    room.currentTime = time;
    room.playbackSpeed = playbackSpeed;
    
    socket.to(roomId).emit('syncVideo', { time, playbackSpeed });
  });

  socket.on('play', ({ roomId, time, playbackSpeed }) => {
    socket.to(roomId).emit('play', { time, playbackSpeed });
  });


  socket.on('pause', ({ roomId, time }) => {
    socket.to(roomId).emit('pause', { time });
  });

  socket.on('seek', ({ roomId, time }) => {
    socket.to(roomId).emit('seek', { time });
  });

  socket.on('mute', ({ roomId }) => {
    socket.to(roomId).emit('mute');
  });
  
  socket.on('unmute', ({ roomId }) => {
    socket.to(roomId).emit('unmute');
  });
  

  socket.on('disconnect', () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.users.delete(socket.id);
      
      if (room.users.size === 0) {
        rooms.delete(currentRoom);
      } else {
        io.to(currentRoom).emit('roomUsers', Array.from(room.users));
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});