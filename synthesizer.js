import Keyboard from "./keyboard.js";

// Audio context and master out
const CONTEXT = new (window.AudioContext || window.webkitAudioContext)();
const ANALYZER = CONTEXT.createAnalyser();
ANALYZER.fftSize = 2048;
let bufferLength = ANALYZER.frequencyBinCount;
let dataArray = new Uint8Array(bufferLength);
const MASTER_OUT = CONTEXT.destination;

// LCD
const LCD = document.getElementById("display");
let lcdContext = LCD.getContext("2d");

let fitToContainer = lcd => {
  lcd.style.width = "100%";
  lcd.style.height = "100%";
  lcd.width = lcd.offsetWidth;
  lcd.height = lcd.offsetHeight;
};

fitToContainer(LCD);

let visualize = () => {
  let WIDTH = LCD.width;
  let HEIGHT = LCD.height;
  lcdContext.clearRect(0, 0, WIDTH, HEIGHT);

  let draw = () => {
    requestAnimationFrame(draw);
    ANALYZER.getByteTimeDomainData(dataArray);
    lcdContext.fillStyle = "rgb(200, 200, 200)";
    lcdContext.fillRect(0, 0, WIDTH, HEIGHT);
    lcdContext.lineWidth = 2;
    lcdContext.strokeStyle = "rbg(0, 0, 0)";
    lcdContext.beginPath();
    let sliceWidth = (WIDTH * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      let y = (v * HEIGHT) / 2;

      if (i === 0) {
        lcdContext.moveTo(x, y);
      } else {
        lcdContext.lineTo(x, y);
      }

      x += sliceWidth;
    }

    lcdContext.lineTo(LCD.width, LCD.height / 2);
    lcdContext.stroke();
  };

  draw();
};

// VCO
const VCO = CONTEXT.createOscillator();
VCO.type = "sine";
VCO.start(0);

let oscillator_selector = document.getElementById("oscillatorSelector");
oscillator_selector.addEventListener(
  "change",
  e => (VCO.type = e.target.value)
);

// VCA
const VCA = CONTEXT.createGain();
VCA.gain.setValueAtTime(0, CONTEXT.currentTime);
let volume = 0.2;

let vca_volume = document.getElementById("vcaVolume");
vca_volume.addEventListener("input", e => {
  volume = e.target.value;
  if (Keyboard.activeNotes.length > 0) {
    VCA.gain.linearRampToValueAtTime(volume, CONTEXT.currentTime + 0.02);
  }
});

// Routing
VCO.connect(VCA);
VCA.connect(ANALYZER);
VCA.connect(MASTER_OUT);

// MIDI
if (navigator.requestMIDIAccess) {
  navigator
    .requestMIDIAccess({
      sysex: false
    })
    .then(onMIDISuccess, onMIDIFailure);
} else {
  console.log("No MIDI support in your browser.");
}

function onMIDISuccess(midiAccess) {
  let inputs = midiAccess.inputs.values();
  for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
    //  call onMIDIMessage for each midi call
    input.value.onmidimessage = onMIDIMessage;
  }
}

let midi_message_on = 144;
let midi_message_off = 128;

function onMIDIMessage(event) {
  let data = event.data;
  let type = data[0] & 0xf0;
  let note_number = data[1];
  let velocity = data[2];

  switch (type) {
    case midi_message_on:
      if (velocity !== 0) {
        noteOn(note_number);
      }
      break;

    case midi_message_off:
      noteOff(note_number);
      break;
  }
}

function onMIDIFailure(e) {
  console.log(`No access to MIDI devices ${e}`);
}

function noteOn(keyCode) {
  let frequency = frequencyFromNoteNumber(Keyboard.playableKeys[keyCode]);
  VCO.frequency.setValueAtTime(frequency, CONTEXT.currentTime);
  VCA.gain.linearRampToValueAtTime(volume, CONTEXT.currentTime + 0.02);
  Keyboard.noteOn = keyCode;
  document.querySelector(`[data-key='${keyCode}']`).classList.add("playing");
  visualize();
}

function noteOff(keyCode) {
  Keyboard.noteOff = keyCode;
  document.querySelector(`[data-key='${keyCode}']`).classList.remove("playing");

  if (Keyboard.activeNotes.length === 0) {
    VCA.gain.linearRampToValueAtTime(0, CONTEXT.currentTime + 0.02);
  } else {
    noteOn(Keyboard.currentNote);
  }
}

function frequencyFromNoteNumber(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function changeOctave(direction) {
  let octave = 12;

  Object.keys(Keyboard.playableKeys).forEach(pitch => {
    if (direction === "up") {
      Keyboard.playableKeys[pitch] += octave;
    } else {
      Keyboard.playableKeys[pitch] -= octave;
    }
  });
  if (Keyboard.currentNote) noteOn(Keyboard.currentNote);
}

document.addEventListener("keydown", keyHandler);
document.addEventListener("keyup", keyHandler);

function keyHandler(e) {
  if (e.repeat) return;

  switch (e.type) {
    case "keydown":
      if (Keyboard.playableKeys.hasOwnProperty(e.code)) noteOn(e.code);
      if (e.code === "KeyZ") changeOctave("down");
      if (e.code === "KeyX") changeOctave("up");
      break;
    case "keyup":
      if (Keyboard.playableKeys.hasOwnProperty(e.code)) noteOff(e.code);
      break;
  }
}

document.getElementById("power").addEventListener("click", e => {
  let checkbox = e.target;

  switch (checkbox.checked) {
    case true:
      CONTEXT.resume().then(() => console.log("Power On"));
      break;
    case false:
      CONTEXT.suspend().then(() => console.log("Power Off"));
      break;
  }
});
