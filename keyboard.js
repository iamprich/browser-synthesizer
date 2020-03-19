const PLAYABLE_KEYS = {
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
  KeyK: 72
};

export default class Keyboard {
  constructor() {
    this.playable_keys = PLAYABLE_KEYS;
    this.active_notes = [];
  }

  get currentNote() {
    return this.active_notes[this.active_notes.length - 1];
  }

  noteOn(keyCode) {
    if (this.active_notes.includes(keyCode)) return;
    this.active_notes.push(keyCode);
  }

  noteOff(keyCode) {
    this.active_notes.splice(this.active_notes.indexOf(keyCode), 1);
  }
}
