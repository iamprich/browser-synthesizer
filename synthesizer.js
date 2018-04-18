// Audio context and master out
const CONTEXT = new AudioContext();
const MASTER_OUT = CONTEXT.destination;

// VCO
const VCO = CONTEXT.createOscillator();
VCO.type = 'sine';
VCO.start(0);

let oscillator_selector = document.getElementById('oscillatorSelector');
oscillator_selector.addEventListener('change', (e => VCO.type = e.target.value));

// VCA
const VCA = CONTEXT.createGain();
VCA.gain.setValueAtTime(0.0001, CONTEXT.currentTime);
let volume = 0.20;

let vca_volume = document.getElementById('vcaVolume');
vca_volume.addEventListener('input', (e => volume = e.target.value));

// Routing
VCO.connect(VCA);
VCA.connect(MASTER_OUT);

// MIDI
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({
        sysex: false
    }).then(onMIDISuccess, onMIDIFailure);
} else {
    console.log('No MIDI support in your browser.');
}

function onMIDISuccess(midiAccess) {
    let inputs = midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        //    call onMIDIMessage for each midi call
        input.value.onmidimessage = onMIDIMessage;
    }
}

function onMIDIMessage(event) {
    let data = event.data;
    let type = data[0] & 0xf0;
    let note_number = data[1];
    let velocity = data[2];

    switch (type) {
        case 144:
            //        note on
            if (velocity !== 0) {
                noteOn(note_number);
            }
            break;

        case 128:
            //        note off
            noteOff(note_number);
            break;
    }
}

function onMIDIFailure(e) {
    console.log(`No access to MIDI devices ${e}`)
}


// Note functions
let active_notes = {};

function noteOn(noteNumber) {
    let frequency = frequencyFromNoteNumber(noteNumber);
    VCO.frequency.setValueAtTime(frequency, CONTEXT.currentTime);
    VCA.gain.linearRampToValueAtTime(volume, CONTEXT.currentTime + 0.02);
    active_notes[noteNumber] = 'active';
    if (getElementFromNoteNumber(noteNumber)) {
        getElementFromNoteNumber(noteNumber).classList.add('playing');
    }
}

function noteOff(noteNumber) {
    delete active_notes[noteNumber];
    if (getElementFromNoteNumber(noteNumber)) {
        getElementFromNoteNumber(noteNumber).classList.remove('playing');
    }
    if (Object.keys(active_notes).length === 0) {
        VCA.gain.linearRampToValueAtTime(0.0001, CONTEXT.currentTime + 0.02)
    }
    if (Object.values(active_notes).includes('active')) {
        let previous_note = Object.keys(active_notes)[Object.keys(active_notes).length - 1];
        noteOn(previous_note);

    }
}

function frequencyFromNoteNumber(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
}

function getElementFromNoteNumber(noteNumber) {
    let keyboard = Array.from(document.getElementById('keyboard').children);
    for (let key of keyboard) {
        if (key.dataset.note === noteNumber.toString()) {
            return key
        }
    }
}

let playable_keys = {
    'KeyA': 60,
    'KeyW': 61,
    'KeyS': 62,
    'KeyE': 63,
    'KeyD': 64,
    'KeyF': 65,
    'KeyT': 66,
    'KeyG': 67,
    'KeyY': 68,
    'KeyH': 69,
    'KeyU': 70,
    'KeyJ': 71,
    'KeyK': 72
};

// Keyboard event listeners
document.addEventListener('keydown', keyController);
document.addEventListener('keyup', keyController);

// Keyboard controller
function keyController(e) {
    if (e.repeat) {
        return
    }
    if (e.type === 'keydown' && playable_keys.hasOwnProperty(e.code)) {
        noteOn(playable_keys[e.code]);

    } else if (e.type === 'keyup' && playable_keys.hasOwnProperty(e.code)) {
        noteOff(playable_keys[e.code]);
    }
}