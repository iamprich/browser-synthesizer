// Audio context and master out
const CONTEXT = new AudioContext();
const MASTER_OUT = CONTEXT.destination;

// VCO
const VCO = CONTEXT.createOscillator();
VCO.type = 'sine';
VCO.start(0);

let oscillator_selector = document.getElementById('oscillatorSelector');
oscillator_selector.addEventListener(
    'change',
    e => (VCO.type = e.target.value),
);

// VCA
const VCA = CONTEXT.createGain();
VCA.gain.setValueAtTime(0.0001, CONTEXT.currentTime);
let volume = 0.2;

let vca_volume = document.getElementById('vcaVolume');
vca_volume.addEventListener('input', e => {
  volume = e.target.value;
  // VCA.gain.linearRampToValueAtTime(volume, CONTEXT.currentTime + 0.02);
  VCA.gain.setValueAtTime(volume, CONTEXT.currentTime);
});

// Routing
VCO.connect(VCA);
VCA.connect(MASTER_OUT);

// MIDI
if (navigator.requestMIDIAccess) {
  navigator.requestMIDIAccess({
    sysex: false,
  }).then(onMIDISuccess, onMIDIFailure);
} else {
  console.log('No MIDI support in your browser.');
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

// Note functions
let active_notes = {};

function noteOn(keyCode) {
  let frequency = frequencyFromNoteNumber(playable_keys[keyCode]);
  VCO.frequency.setValueAtTime(frequency, CONTEXT.currentTime);
  VCA.gain.linearRampToValueAtTime(volume, CONTEXT.currentTime + 0.02);
  active_notes[keyCode] = 'active';
  document.querySelector(`[data-key='${keyCode}']`).classList.add('playing');
}

function noteOff(keyCode) {
  delete active_notes[keyCode];
  document.querySelector(`[data-key='${keyCode}']`).classList.remove('playing');

  if (Object.keys(active_notes).length === 0) {
    VCA.gain.linearRampToValueAtTime(0.0001, CONTEXT.currentTime + 0.02);
  }

  if (Object.values(active_notes).includes('active')) {
    let previous_note = Object.keys(active_notes)[
    Object.keys(active_notes).length - 1
        ];
    noteOn(previous_note);
  }
}

function frequencyFromNoteNumber(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

//  TODO would be cool if the keyboard was all state based. Own class!
let playable_keys = {
  KeyA: 60,
  KeyW: 61,
  KeyS: 62,
  KeyE: 63,
  KeyD: 64,
  KeyF: 65,
  KeyT: 66,
  KeyG: 67,
  KeyY: 68,
  KeyH: 69,
  KeyU: 70,
  KeyJ: 71,
  KeyK: 72,
};

function changeOctave(direction) {
  // REFACTOR this into a constant
  // TODO set a max octave count and display current octave
  // max +-3
  let octave = 12;

  Object.keys(playable_keys).forEach(pitch => {
    if (direction === 'up') {
      playable_keys[pitch] += octave;
    } else {
      playable_keys[pitch] -= octave;
    }

    //  TODO re-trigger the active note here
  });
}

// function octaveHandler(e) {
//   let direction = e.target.dataset.direction;
//   direction === 'up' ? changeOctave('up') : changeOctave('down');
// }
//
// octave_up = document.getElementById('octave-up');
// octave_up.addEventListener('click', octaveHandler);
//
// octave_down = document.getElementById('octave-down');
// octave_down.addEventListener('click', octaveHandler);

document.addEventListener('keydown', keyHandler);
document.addEventListener('keyup', keyHandler);

function keyHandler(e) {
  if (e.repeat) return;

  switch (e.type) {
    case 'keydown':
      if (playable_keys.hasOwnProperty(e.code)) noteOn(e.code);
      if (e.code === 'KeyX') changeOctave('up');
      if (e.code === 'KeyZ') changeOctave('down');
      break;
    case 'keyup':
      if (playable_keys.hasOwnProperty(e.code)) noteOff(e.code);
      break;
  }
}

document.getElementById('power').addEventListener('click', (e) => {
  console.log(e.target);
  let checkbox = e.target;

  switch (checkbox.checked) {
    case true:
      CONTEXT.resume().then(() => console.log('Power On'));
      break;
    case false:
      CONTEXT.suspend().then(() => console.log('Power Off'));
      break;
  }
});
