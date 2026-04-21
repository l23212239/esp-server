// public/voice-assistant.js

const WAKE_WORD = 'morenito';       // ← pon el nombre que quieras
const WAKE_TIMEOUT_MS = 8000;   // escucha activa por 8 segundos

const synth = window.speechSynthesis;
let recognition;
let awake = false;
let wakeTimer = null;

// ── Voz de respuesta ──────────────────────────────────────
function speak(text) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'es-MX';
  utter.rate = 1.0;
  utter.pitch = 1.1;
  const voices = synth.getVoices();
  const voice = voices.find(v => v.lang.startsWith('es') && v.name.includes('female'))
             || voices.find(v => v.lang.startsWith('es'))
             || voices[0];
  if (voice) utter.voice = voice;
  synth.cancel(); // corta si ya estaba hablando
  synth.speak(utter);
}

// ── Inicializar Web Speech API ────────────────────────────
function initRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn('Web Speech API no soportada');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'es-MX';
  recognition.continuous = true;   // escucha continua para el wake word
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript
                            .trim().toLowerCase();
    console.log('[VOZ]', transcript);

    if (!awake) {
      // ── Modo espera: detectar wake word ──
      if (transcript.includes(WAKE_WORD)) {
        wakeUp();
      }
      if (transcript.includes('cerrar micrófono') || transcript.includes('apagar micrófono')) {
            btnMic.dataset.active = 'false';
            recognition.stop();
            resetMic();
            speak('Micrófono cerrado');
        }
    } else {
      // ── Modo activo: procesar comando ──
      processCommand(transcript);
    }
  };

  recognition.onerror = (e) => console.error('[STT Error]', e.error);

  // reinicio automático para escucha continua
  recognition.onend = () => {
    if (!synth.speaking) recognition.start();
  };

  recognition.start();
  console.log(`[Asistente] Esperando wake word: "${WAKE_WORD}"`);
}

// ── Activación por wake word ──────────────────────────────
function wakeUp() {
  awake = true;
  speak(`Hola, ¿en qué te puedo ayudar?`);
  updateStatus('🎙️ Escuchando comando...');

  clearTimeout(wakeTimer);
  wakeTimer = setTimeout(() => {
    awake = false;
    speak('De acuerdo, avísame cuando me necesites.');
    updateStatus('💤 En espera...');
  }, WAKE_TIMEOUT_MS);
}

// ── Enviar comando al servidor ────────────────────────────
async function processCommand(command) {
  clearTimeout(wakeTimer);
  awake = false;
  updateStatus(`⚙️ Ejecutando: "${command}"`);

  try {
    const res = await fetch('/api/voice-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command })
    });
    const data = await res.json();

    speak(data.speech || 'Listo');
    updateStatus('💤 En espera...');
  } catch (err) {
    speak('Hubo un error al conectar con el servidor.');
    console.error(err);
  }
}

// ── UI helper ─────────────────────────────────────────────
function updateStatus(msg) {
  const el = document.getElementById('voice-status');
  if (el) el.textContent = msg;
}

// ── Arrancar ──────────────────────────────────────────────
window.addEventListener('load', () => {
  // Los navegadores requieren un gesto del usuario para el micrófono
  document.getElementById('btn-start-voice')
          ?.addEventListener('click', () => {
            initRecognition();
            document.getElementById('btn-start-voice').style.display = 'none';
            updateStatus('💤 En espera de: "' + WAKE_WORD + '"...');
          });
});