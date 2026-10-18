/* Browser text-to-speech (Listen / Slow) and speech recognition (mic). */
/* ============================================================
   Text-to-speech (reference audio)
   ============================================================ */
let voices = [];
let currentUtterance = null; // kept so Chrome doesn't garbage-collect it mid-speech

function loadVoices() { voices = window.speechSynthesis ? speechSynthesis.getVoices() : []; }
if (window.speechSynthesis) {
  loadVoices();
  speechSynthesis.addEventListener('voiceschanged', loadVoices);
}

// Chrome loads its voice list a moment after the page opens, so wait for it (max 1.5s)
function waitForVoices() {
  if (voices.length) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { loadVoices(); resolve(); };
    speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

function pickVoice(langPrefix) {
  const matches = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(langPrefix));
  // Prefer Singapore / natural-sounding voices when available
  return matches.find((v) => /SG|Singapore/i.test(v.lang + v.name))
      || matches.find((v) => /natural|neural|google/i.test(v.name))
      || matches[0];
}

async function speak(rate) {
  if (playback) { playback.pause(); playback = null; }
  if (!window.speechSynthesis) return showNotice('Audio playback is not supported in this browser.');
  await waitForVoices();

  const lesson = LESSONS[state.lang];
  const voice = pickVoice(lesson.ttsLang);
  console.log('[pronunciation] voices for ' + lesson.ttsLang + ':',
    voices.filter((v) => v.lang.toLowerCase().startsWith(lesson.ttsLang)).map((v) => v.name + ' (' + v.lang + ')'));

  if (!voice) {
    showNotice('No ' + lesson.speechLang + ' voice found on this device, so it may sound off or stay silent. On Windows: Settings > Time & language > Speech > Add voices.');
  } else {
    hideNotice();
  }

  const u = new SpeechSynthesisUtterance(state.items[state.index].text);
  if (voice) u.voice = voice;
  u.lang = voice ? voice.lang : lesson.speechLang;
  u.rate = rate;
  u.onerror = (e) => {
    if (e.error !== 'interrupted' && e.error !== 'canceled') {
      showNotice('Could not play the audio (' + e.error + '). Check that your volume is on and try again.');
    }
  };
  currentUtterance = u;

  // Chrome bug: speak() straight after cancel() is sometimes silently dropped
  const busy = speechSynthesis.speaking || speechSynthesis.pending;
  speechSynthesis.cancel();
  speechSynthesis.resume();
  setTimeout(() => speechSynthesis.speak(u), busy ? 150 : 0);
}

/* ============================================================
   Recording the user's own voice (for "My voice" / "Compare")
   Runs alongside speech recognition. If the browser can't record,
   the Compare buttons just stay hidden; nothing else breaks.
   ============================================================ */
let micStream = null;      // kept open while on this page so recording starts instantly
let recorder = null;
let recChunks = [];
let myRecordingUrl = null; // the latest attempt, as a playable audio URL
let playback = null;       // the <audio> currently playing, if any

async function startRecording() {
  clearRecording();
  if (!window.MediaRecorder || !navigator.mediaDevices) return;
  try {
    if (!micStream) micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(micStream);
    recChunks = [];
    recorder.ondataavailable = (e) => { if (e.data.size) recChunks.push(e.data); };
    recorder.onstop = () => {
      if (!recChunks.length) return;
      myRecordingUrl = URL.createObjectURL(new Blob(recChunks, { type: recorder.mimeType }));
      onRecordingReady();   // in script.js: shows the Compare buttons
    };
    recorder.start();
  } catch (err) {
    recorder = null;        // mic refused or busy: recognition still works, Compare is skipped
  }
}

function stopRecording() {
  if (recorder && recorder.state === 'recording') recorder.stop();
}

function clearRecording() {
  stopPlayback();
  if (myRecordingUrl) URL.revokeObjectURL(myRecordingUrl);
  myRecordingUrl = null;
}

function stopPlayback() {
  if (playback) { playback.pause(); playback = null; }
  if (window.speechSynthesis) speechSynthesis.cancel();
}

// Play the user's recording. `then` runs after it finishes (used by Compare).
function playMine(then) {
  if (!myRecordingUrl) return;
  stopPlayback();
  playback = new Audio(myRecordingUrl);
  playback.onended = () => { playback = null; if (then) setTimeout(then, 400); };
  playback.play().catch(() => { playback = null; });
}

// Your attempt first, then the correct version, so you can hear the difference
function compareWithCorrect() {
  playMine(() => speak(0.9));
}

// Let go of the mic when leaving the page
function releaseMic() {
  stopRecording();
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
}
window.addEventListener('pagehide', releaseMic);

/* ============================================================
   Speech recognition
   ============================================================ */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let rec = null;

function startListening() {
  if (!SR) {
    showNotice('Speech recognition needs Chrome or Edge. You can still listen and skip for now.');
    return;
  }
  if (window.speechSynthesis) speechSynthesis.cancel();
  hideNotice();
  hideResult();

  rec = new SR();
  rec.lang = LESSONS[state.lang].speechLang;
  rec.interimResults = true;
  rec.maxAlternatives = 3;
  rec.continuous = false;

  let gotFinal = false;

  rec.onresult = (e) => {
    const res = e.results[e.results.length - 1];
    els.heard.textContent = 'Heard: ' + res[0].transcript;
    if (res.isFinal) {
      gotFinal = true;
      const alts = Array.from(res).map((a) => a.transcript);
      handleFinal(alts);
    }
  };

  rec.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      showNotice('Microphone access is blocked. Allow the mic in your browser settings and try again.');
    } else if (e.error === 'no-speech') {
      showNotice("Didn't catch that. Tap the mic and try again, no rush.");
    } else if (e.error === 'language-not-supported') {
      showNotice('This browser cannot recognise this language yet. Try Chrome on desktop or Android.');
    } else if (e.error === 'network') {
      showNotice("Can't reach the speech service. Open this page in Google Chrome (not the VS Code preview) and check your internet connection.");
    } else if (e.error !== 'aborted') {
      showNotice('Something went wrong with the mic (' + e.error + '). Please try again.');
    }
  };

  rec.onend = () => {
    stopRecording();
    setListening(false);
    if (!gotFinal && !els.heard.textContent) els.micHint.textContent = 'Tap to speak';
  };

  els.heard.textContent = '';
  setListening(true);
  startRecording();
  try { rec.start(); } catch (err) { setListening(false); stopRecording(); }
}

function stopListening() {
  if (rec) rec.stop();
}

function setListening(on) {
  state.listening = on;
  els.micZone.classList.toggle('is-listening', on);
  els.micBtn.setAttribute('aria-label', on ? 'Stop speaking' : 'Start speaking');
  els.micHint.textContent = on ? 'Listening… tap to stop' : 'Tap to speak';
}