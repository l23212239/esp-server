const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    allowEIO3: true
});

app.use(express.static('public'));

let arduinoSocket = null;  // Wemos Lolin32 Lite
let esp32PotSocket = null; // ESP32 Steren con potenciómetro

io.on('connection', function(socket) {
    console.log('Cliente conectado:', socket.id);

    // --- Identificación de dispositivos ---
    socket.on('identificar', function(data) {
        if (data === 'arduino') {
            arduinoSocket = socket;
            console.log('Wemos (arduino) registrado:', socket.id);
            io.sockets.emit('estado_arduino', { conectado: true });
        }
        else if (data === 'esp32_pot') {
            esp32PotSocket = socket;
            console.log('ESP32 potenciómetro registrado:', socket.id);
            io.sockets.emit('estado_esp32_pot', { conectado: true });
        }
    });

    // --- Desconexión ---
    socket.on('disconnect', function() {
        if (arduinoSocket && socket.id === arduinoSocket.id) {
            arduinoSocket = null;
            console.log('Wemos desconectado');
            io.sockets.emit('estado_arduino', { conectado: false });
        }
        if (esp32PotSocket && socket.id === esp32PotSocket.id) {
            esp32PotSocket = null;
            console.log('ESP32 potenciómetro desconectado');
            io.sockets.emit('estado_esp32_pot', { conectado: false });
        }
    });

    // --- Datos del LDR (desde el Wemos) ---
    socket.on('desde_arduino', function(data) {
        console.log('LDR:', data.ldr);
        io.sockets.emit('arduino', data);
    });

    // --- Datos del potenciómetro (desde el ESP32 Steren) ---
    socket.on('desde_pot', function(data) {
        console.log(`Potenciómetro → raw: ${data.raw} | porcentaje: ${data.porcentaje}%`);
        // Retransmitir a todos los clientes web / Python
        io.sockets.emit('potenciometro', data);
    });

    // --- Comandos desde Python/web → Wemos ---
    socket.on('comando', function(data) {
        console.log('Comando recibido:', data);
        if (arduinoSocket) {
            arduinoSocket.emit('comando', data);
        } else {
            console.log('Wemos no conectado');
            socket.emit('error', 'Wemos no conectado');
        }
    });
});

server.listen(3000, '0.0.0.0', function() {
    console.log('Servidor corriendo en puerto 3000');
});