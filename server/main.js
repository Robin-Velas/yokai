"use strict"

process.on("uncaughtException", err => console.log(err));

const express = require("express");
const router = express();

const server = require("http").createServer(router);
const io = require("socket.io")(server, {cors: {origin: '*', methods: ["GET", "POST"]}});

router.use(express.static("public"));

// l'ensemble des services que nous hébergeons
const Yokai = require("./yokai/auth")

// une API JSON pour les statistiques du Yokai
router.get("/apis/yokai/stats", (req, res) =>
{
    res.json(Yokai.stats)
})

io.on("connection", sock => {
    switch (sock.handshake.query.service) {
        // le service demandé est : Yokai
        case "Yōkai" :
            return Yokai.welcome(sock)
        // le service demandé n'est pas connu
        default :
            return sock.disconnect(true)
    }
})

server.listen(8080);

console.log("Node + Express Server is Active.");
