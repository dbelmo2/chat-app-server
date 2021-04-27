const express = require('express')
const app = express()
const http = require('http')
const path = require('path')
const fs = require('fs');
const options = {
	key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
	cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem'))
};

const server = http.createServer(app)
const { nanoid } = require('nanoid')


// maps a clients socket to their stream
let streams = new Map();
// maps a sessKey to an array of sockets for the sess
let sessions = new Map();
// maps a clients socket to their partners socket
let partners = new Map();


const io = require("socket.io")(server, {
    cors: {
	    origins: ["https://dbelmo2.github.io/chat-app/","http://the-lounge.tech" , "http://localhost:3000"],
        methods: ['GET', 'POST']
    }
})

io.on('connection', (socket) => {
    console.log("New Client: " + socket.id);
    socket.on("hosting-video-call", () => {
        var sessKey = nanoid(10);
        sessions.set(sessKey, [socket]);
        socket.emit("session-key", sessKey);
    });
    socket.on("joining-video-call", () => {
        var partner = partners.get(socket);
        socket.emit("session-key", partner.sessKey);
    }) 
    socket.on("host-signal", data => {
        console.log("host-signal fired");
        streams.set(socket, data);
    });
    socket.on("guest-signal", data => {
        console.log("guest-signal fired");
        streams.set(socket, data);
        var partner = partners.get(socket);
        partner.socket.emit("signal-data", data);
    });
    socket.on('get-host-data', () => {
        console.log("get-host-data fired");
        var partner = partners.get(socket);
        var data = streams.get(partner.socket);
        socket.emit("signal-data", data);
    })
    
    socket.on("sessKey-submit", (sessKey) => {
        var session = sessions.get(sessKey);
        if(session) {
            //map the two clients to each other
            partners.set(socket, {socket: session[0], sessKey: sessKey});
            partners.set(session[0], {socket: socket, sessKey: sessKey});
            //Add this users socket to the session array
            sessions.set(sessKey, (session) => [...session, socket]);
            //inform the client that the session was found
            socket.emit("matching-sess");

        } else {
            //inform the client that no matching session was found
            socket.emit("no-matching-sess");
        }
    });

    socket.on("disconnect", (reason) => {
        console.log("Client: " + socket.id + " has disconnected: " + reason);
        var partner = partners.get(socket);
        console.log("disconnected sockets partner: " + partner);
        try {
        partners.delete(partner.socket);
        partners.delete(socket);
        sessions.delete(partner.sessKey);
        streams.delete(socket);
        } catch(error) {
            //console.log(error);
        }

    })
});

server.listen(8443, () => console.log("Server running on port 8443..."))
