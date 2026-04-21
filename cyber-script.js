// Audio Synthesis Logic
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playCyberSound(type) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'search') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'voice-start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    } else if (type === 'voice-end') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    }
}

// Voice Recognition Logic
let recognition;
let isRecording = false;

function setupSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            document.getElementById('user-input').value = text;
            addLog("VOICE_CAPTURE: " + text);
            send();
        };

        recognition.onend = () => {
            isRecording = false;
            document.getElementById('mic-btn').classList.remove('active');
            document.getElementById('mic-btn').innerText = "🎤";
            playCyberSound('voice-end');
        };

        recognition.onerror = (e) => {
            addLog("VOICE_ERR: " + e.error, true);
            isRecording = false;
            document.getElementById('mic-btn').classList.remove('active');
        };
    }
}

function toggleVoice() {
    if (!recognition) {
        addLog("ERR: Reconocimiento de voz no soportado en este navegador.", true);
        return;
    }
    if (isRecording) {
        recognition.stop();
    } else {
        try {
            recognition.start();
            isRecording = true;
            document.getElementById('mic-btn').classList.add('active');
            document.getElementById('mic-btn').innerText = "🔴";
            playCyberSound('voice-start');
        } catch (e) {
            addLog("ERR: " + e.message, true);
        }
    }
}

// 3D Cube Logic
const canvas = document.getElementById('cube-canvas');
const ctx = canvas.getContext('2d');
canvas.width = 250; canvas.height = 150;
let angle = 0;

function drawCube() {
    ctx.clearRect(0,0,250,150);
    ctx.strokeStyle = "#ff00ff"; ctx.lineWidth = 1;
    const size = 30; const cx = 125, cy = 75;
    const points = [
        [-1,-1,-1], [1,-1,-1], [1,1,-1], [-1,1,-1],
        [-1,-1,1], [1,-1,1], [1,1,1], [-1,1,1]
    ];
    const rotated = points.map(p => {
        let x = p[0], y = p[1], z = p[2];
        let tx = x * Math.cos(angle) - z * Math.sin(angle);
        let tz = x * Math.sin(angle) + z * Math.cos(angle);
        let ty = y * Math.cos(angle) - tz * Math.sin(angle);
        tz = y * Math.sin(angle) + tz * Math.cos(angle);
        return [tx * size + cx, ty * size + cy];
    });
    const lines = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    lines.forEach(l => {
        ctx.beginPath(); ctx.moveTo(rotated[l[0]][0], rotated[l[0]][1]);
        ctx.lineTo(rotated[l[1]][0], rotated[l[1]][1]); ctx.stroke();
    });
    angle += 0.02;
    requestAnimationFrame(drawCube);
}
drawCube();

// Instruction Pointer Sim
setInterval(() => {
    const ptr = document.getElementById('inst-ptr');
    ptr.innerHTML = `EAX: 0x${Math.random().toString(16).substr(2,6).toUpperCase()}<br>EBX: 0x${Math.random().toString(16).substr(2,6).toUpperCase()}<br>ESP: 0x${Math.random().toString(16).substr(2,6).toUpperCase()}`;
}, 500);

// Scroll Logic
const terminal = document.getElementById('terminal');
const scrollUp = document.getElementById('scroll-up');
const scrollDown = document.getElementById('scroll-down');

terminal.addEventListener('scroll', () => {
    const isAtTop = terminal.scrollTop < 100;
    const isAtBottom = terminal.scrollHeight - terminal.scrollTop <= terminal.clientHeight + 100;
    
    scrollUp.style.display = isAtTop ? 'none' : 'block';
    scrollDown.style.display = isAtBottom ? 'none' : 'block';
});

function scrollToBottom() {
    terminal.scrollTo({ top: terminal.scrollHeight, behavior: 'smooth' });
}

function scrollToTop() {
    terminal.scrollTo({ top: 0, behavior: 'smooth' });
}

// Logic
let API_KEY = (localStorage.getItem('GEMINI_KEY') || "").trim();
let chatHistory = [];
let STABLE_CONFIG = null;

function addLog(t, isErr = false) { 
    const l = document.getElementById('logs'); 
    const color = isErr ? 'var(--err)' : 'var(--p)';
    l.innerHTML = `<span style="color:${color}">> ${t}</span><br>` + l.innerHTML; 
}

function toggleAuth(show) {
    document.getElementById('auth-modal').style.display = show ? 'block' : 'none';
    if(show) document.getElementById('api-key-input').value = API_KEY;
}

function saveKey() {
    const val = document.getElementById('api-key-input').value.trim();
    if(val) {
        API_KEY = val;
        STABLE_CONFIG = null;
        localStorage.setItem('GEMINI_KEY', val);
        addLog("SOURCE: Credentials updated.");
        document.getElementById('key-stat').innerText = "UPDATED";
        document.getElementById('key-stat').style.color = "var(--sys)";
        toggleAuth(false);
    }
}

async function discoverModel() {
    addLog("SOURCE: Scanning available neural nodes...");
    try {
        const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await resp.json();
        
        if (data.error) throw new Error(data.error.message);
        
        const validModels = data.models.filter(m => 
            m.supportedGenerationMethods.includes("generateContent")
        );

        if (validModels.length === 0) throw new Error("No usable models found for this key.");

        const priority = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"];
        let selected = validModels[0].name.split('/').pop();

        for (let p of priority) {
            if (validModels.some(m => m.name.includes(p))) {
                selected = p;
                break;
            }
        }

        STABLE_CONFIG = { model: selected, ver: "v1beta" };
        addLog(`LINK_STABLE: Node ${selected} connected.`);
        return true;
    } catch (e) {
        throw new Error("DISCOVERY_FAILED: " + e.message);
    }
}

async function send() {
    const input = document.getElementById('user-input'); 
    const btn = document.querySelector('#dock .btn:last-child');
    const val = input.value.trim();
    if(!val || input.disabled) return;
    
    if(!API_KEY) {
        addLog("ERR: No API Key found. Press AUTH.", true);
        toggleAuth(true);
        return;
    }

    playCyberSound('search');

    input.disabled = true;
    btn.innerText = "PROCESANDO...";
    
    const term = document.getElementById('terminal');
    const userMsg = document.createElement('div'); userMsg.className = 'msg user-msg';
    userMsg.innerText = val; term.appendChild(userMsg); 
    scrollToBottom();

    addLog("SOURCE: Injecting neural instructions...");
    document.querySelectorAll('.cable').forEach(c => c.style.opacity = '1');

    try {
        if (!STABLE_CONFIG) await discoverModel();

        const url = `https://generativelanguage.googleapis.com/${STABLE_CONFIG.ver}/models/${STABLE_CONFIG.model}:generateContent?key=${API_KEY}`;
        const resp = await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [...chatHistory, { role: "user", parts: [{ text: val }] }] })
        });
        
        const d = await resp.json();
        
        if (!resp.ok) {
            STABLE_CONFIG = null;
            throw new Error(d.error?.message || "Protocol link severed.");
        }

        if (d.candidates && d.candidates[0] && d.candidates[0].content) {
            const aiText = d.candidates[0].content.parts[0].text;
            const aiMsg = document.createElement('div'); aiMsg.className = 'msg ai-msg';
            aiMsg.innerText = aiText; term.appendChild(aiMsg); 
            
            chatHistory.push({ role: "user", parts: [{ text: val }] });
            chatHistory.push(d.candidates[0].content);
            addLog("SOURCE: Instruction executed.");
        } else {
            throw new Error("EMPTY_RESPONSE: Model blocked or empty.");
        }

    } catch(e) { 
        addLog("ERR: " + e.message, true); 
        const errMsg = document.createElement('div'); errMsg.className = 'msg ai-msg';
        errMsg.style.borderColor = 'var(--err)'; errMsg.style.color = 'var(--err)';
        errMsg.innerText = "[CRITICAL_FAILURE]: " + e.message;
        term.appendChild(errMsg); 
    }
    finally { 
        input.value = '';
        input.disabled = false;
        btn.innerText = "EJECUTAR";
        input.focus();
        scrollToBottom();
        document.querySelectorAll('.cable').forEach(c => c.style.opacity = '0.2'); 
    }
}

setInterval(() => document.getElementById('clock').innerText = new Date().toLocaleTimeString(), 1000);
document.getElementById('user-input').addEventListener('keypress', e => { if(e.key==='Enter') send(); });

window.onload = () => {
    setupSpeech();
    if(!API_KEY) {
        addLog("WARN: No API Key detected. Use AUTH button.", true);
        document.getElementById('key-stat').innerText = "MISSING";
        document.getElementById('key-stat').style.color = "var(--err)";
    } else {
        addLog("SOURCE: System ready. Neural link stable.");
        document.getElementById('key-stat').innerText = "OK";
        document.getElementById('key-stat').style.color = "var(--sys)";
    }
    document.getElementById('user-input').focus();
};