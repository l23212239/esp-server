#include <WiFi.h>
#include <ArduinoJson.h>
#include <WebSocketsClient.h>
#include <SocketIOclient.h>

// --- CONFIGURACIÓN DE RED Y SERVIDOR ---
const char* ssid = "nombre_WiFi";
const char* password = "contraseña";

// IP del servidor Node.js (ej. "192.168.1.100"). No uses "localhost"
const char* serverIP = "ip servidor";
const uint16_t serverPort = 3000;

// --- CONFIGURACIÓN DE PINES ---
const int LDR_PIN = 34;
const int LED_PIN = 25;
const int LED_INTERNO = 22;

SocketIOclient socketIO;
unsigned long lastMillis = 0;
const unsigned long INTERVALO_ENVIO = 500; // Enviar datos cada 2 segundos

// Función para manejar los eventos de Socket.IO
void socketIOEvent(socketIOmessageType_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case sIOtype_DISCONNECT:
            Serial.println("[Socket.IO] Desconectado!");
            break;
            
        case sIOtype_CONNECT:
            Serial.printf("[Socket.IO] Conectado a url: %s\n", payload);
            
            // Unirse a la sala o identificarse al conectar
            {
                DynamicJsonDocument doc(1024);
                JsonArray array = doc.to<JsonArray>();
                array.add("identificar");
                array.add("arduino"); // Enviamos el string 'arduino' tal como lo espera el servidor
                
                String output;
                serializeJson(doc, output);
                socketIO.sendEVENT(output);
                Serial.println("[Socket.IO] Mensaje de identificación enviado.");
            }
            break;
            
        case sIOtype_EVENT:
            // Al recibir un evento desde el servidor (comando)
            {
                DynamicJsonDocument doc(1024);
                DeserializationError error = deserializeJson(doc, payload);
                if (error) {
                    Serial.print(F("Error al analizar JSON: "));
                    Serial.println(error.c_str());
                    return;
                }

                // El payload de Socket.IO viene como un array: ["nombre_evento", {datos}]
                String eventName = doc[0];
                
                if (eventName == "comando") {
                    // Extraemos el valor del comando. 
                    // Asumiendo que desde el servidor mandas algo como: socket.emit('comando', 'on') o socket.emit('comando', 'off')
                    String accion = doc[1]; 
                    Serial.print("Comando recibido: ");
                    Serial.println(accion);

                    if (accion == "on" || accion == "1" || accion == "encender" || accion == "led_on") {
                        digitalWrite(LED_PIN, HIGH);
                        Serial.println("LED Encendido");
                    } 
                    else if (accion == "off" || accion == "0" || accion == "apagar" || accion == "led_off") {
                        digitalWrite(LED_PIN, LOW);
                        Serial.println("LED Apagado");
                    }
                    else if (accion == "led_int_on") {
    digitalWrite(LED_INTERNO, LOW);   // LOW enciende
}
else if (accion == "led_int_off") {
    digitalWrite(LED_INTERNO, HIGH);  // HIGH apaga
}
                    // Si envías un objeto JSON en lugar de un string, por ejemplo: socket.emit('comando', { estado: 1 })
                    // Deberías leerlo así:
                    // int estado = doc[1]["estado"];
                    // digitalWrite(LED_PIN, estado);
                }
            }
            break;
    }
}

void setup() {
    Serial.begin(115200);
    
    // Configurar pines
    pinMode(LDR_PIN, INPUT);
    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW); // LED apagado por defecto
    pinMode(LED_INTERNO, OUTPUT);
    digitalWrite(LED_INTERNO, HIGH);

    // Conectar a Wi-Fi
    Serial.println("\nConectando a WiFi...");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi conectado. IP: ");
    Serial.println(WiFi.localIP());

    // Iniciar Socket.IO
    // El parámetro "/socket.io/?EIO=4" es crucial para la compatibilidad con Socket.IO v3 y v4
  socketIO.setExtraHeaders("ngrok-skip-browser-warning: true"); 
    socketIO.begin(serverIP, serverPort, "/socket.io/?EIO=3");
    socketIO.onEvent(socketIOEvent);
}

void loop() {
    socketIO.loop();

    // Enviar datos del LDR cada X milisegundos sin bloquear el código
    if (millis() - lastMillis > INTERVALO_ENVIO) {
        lastMillis = millis();

        // Leer sensor
        int valorLDR = analogRead(LDR_PIN);

        // Crear JSON para enviar al servidor
        // Formato esperado: ["desde_arduino", {"ldr": 1234}]
        DynamicJsonDocument doc(1024);
        JsonArray array = doc.to<JsonArray>();
        array.add("desde_arduino"); // Nombre del evento
        
        JsonObject dataObject = array.createNestedObject();
        dataObject["ldr"] = valorLDR; // Dato a enviar

        String output;
        serializeJson(doc, output);
        socketIO.sendEVENT(output);
        
        Serial.printf("Enviando LDR: %d\n", valorLDR);
    }
}