import socketio

sio = socketio.Client()

IP_SERVER = 'https://phrenetic-raylene-unregressive.ngrok-free.dev/'

# --- Eventos de conexión ---
@sio.event
def connect():
    print("\n[ÉXITO] Conectado al servidor Node.js")
    sio.emit('identificar', 'cliente_python')
    print("Comandos disponibles: led_on | led_off | led_int_on | led_int_off\n")

@sio.event
def disconnect():
    print("\n[AVISO] Desconectado del servidor")

# --- Recibir datos del LDR (Wemos) ---
@sio.on('arduino')
def on_arduino(data):
    print(f"  [LDR] valor: {data.get('ldr')}")

# --- Recibir datos del potenciómetro (ESP32 Steren) ---
@sio.on('potenciometro')
def on_potenciometro(data):
    raw  = data.get('raw', 0)
    pct  = data.get('porcentaje', 0)
    # Barra visual sencilla
    barra = '█' * (pct // 5) + '░' * (20 - pct // 5)
    print(f"  [POT] {barra} {pct:3d}%  (raw: {raw})")

# --- Estado de los dispositivos ---
@sio.on('estado_arduino')
def on_estado_arduino(data):
    estado = "CONECTADO" if data.get('conectado') else "DESCONECTADO"
    print(f"  [INFO] Wemos: {estado}")

@sio.on('estado_esp32_pot')
def on_estado_esp32_pot(data):
    estado = "CONECTADO" if data.get('conectado') else "DESCONECTADO"
    print(f"  [INFO] ESP32 potenciómetro: {estado}")

# --- Conexión ---
try:
    print(f"Conectando a {IP_SERVER}...")
    sio.connect(IP_SERVER)
except Exception as e:
    print(f"Error al conectar: {e}. ¿Está encendido el servidor Node.js?")
    exit()

# --- Bucle de comandos ---
while True:
    try:
        cmd = input('> ').strip()

        if cmd in ('led_on', 'led_off', 'led_int_on', 'led_int_off'):
            sio.emit('comando', cmd)
            print(f"  → Comando '{cmd}' enviado.")
        elif cmd == '':
            continue
        else:
            print("  Comandos válidos: led_on | led_off | led_int_on | led_int_off")

    except KeyboardInterrupt:
        print("\nSaliendo...")
        sio.disconnect()
        break