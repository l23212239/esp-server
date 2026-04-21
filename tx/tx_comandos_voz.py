import socketio
import speech_recognition as sr

# Inicializar cliente Socket.IO
sio = socketio.Client()

# Asegúrate de poner tu enlace de Ngrok o tu IP local aquí
IP_SERVER = 'https://tu-enlace.ngrok-free.app' 

# --- Eventos Socket.IO ---
@sio.event
def connect():
    print("\n[ÉXITO] Conectado al servidor. Listo para transmitir comandos.")
    sio.emit('identificar', 'cliente_python_voz')

@sio.event
def disconnect():
    print("\n[AVISO] Desconectado del servidor.")

# Conectar al servidor
try:
    sio.connect(IP_SERVER)
except Exception as e:
    print(f"Error al conectar: {e}")
    exit()

# --- Configuración de Reconocimiento de Voz ---
r = sr.Recognizer()

def escuchar_y_controlar():
    with sr.Microphone() as source:
        print("\n🎤 Ajustando ruido de fondo... un segundo.")
        r.adjust_for_ambient_noise(source)
        print("🟢 ¡Habla ahora! (Di 'encender externo', 'apagar externo', 'encender interno', o 'salir')")
        
        try:
            # Escuchar por un máximo de 5 segundos
            audio = r.listen(source, timeout=5, phrase_time_limit=5)
            print("⏳ Procesando voz...")
            
            # Traducir audio a texto 
            texto = r.recognize_google(audio, language="es-MX").lower()
            print(f"🗣️ Dijiste: '{texto}'")
            
            # Buscar palabras clave en la frase y enviar el comando correspondiente
            if "encender" in texto and "externo" in texto:
                sio.emit('comando', 'led_on')
                print("-> Comando enviado: led_on (LED 25)")
                
            elif "apagar" in texto and "externo" in texto:
                sio.emit('comando', 'led_off')
                print("-> Comando enviado: led_off (LED 25)")
                
            elif "encender" in texto and "interno" in texto:
                sio.emit('comando', 'led_int_on')
                print("-> Comando enviado: led_int_on (LED Placa)")
                
            elif "apagar" in texto and "interno" in texto:
                sio.emit('comando', 'led_int_off')
                print("-> Comando enviado: led_int_off (LED Placa)")
                
            elif "salir" in texto:
                return False
            else:
                print("⚠️ No detecté ningún comando válido en tu frase.")
                
        except sr.WaitTimeoutError:
            pass # No se detectó voz, vuelve a empezar
        except sr.UnknownValueError:
            print("🤷 No logré entender el audio. Intenta hablar más claro.")
        except sr.RequestError:
            print("⚠️ Error de conexión con el servicio de voz de Google.")
            
    return True

# --- Bucle principal ---
print("\n=== SISTEMA DE CONTROL POR VOZ INICIADO ===")
continuar = True
while continuar:
    continuar = escuchar_y_controlar()

sio.disconnect()
print("Programa terminado.")