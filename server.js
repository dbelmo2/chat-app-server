const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const socket = require("socket.io")
const io = socket(server);

io.on('connection', (socket) => {
    socket.emit("me", socket.id);
})

server.listen(5000, () => console.log("Server running on port 5000..."))