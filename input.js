const keys = new Set();
const justPressed = new Set();

const KEYMAP = {
  'ArrowLeft': 'left', 'a': 'left', 'A': 'left',
  'ArrowRight': 'right', 'd': 'right', 'D': 'right',
  'ArrowUp': 'up', 'w': 'up', 'W': 'up',
  'ArrowDown': 'down', 's': 'down', 'S': 'down',
  ' ': 'fire', 'Spacebar': 'fire',
  'Enter': 'confirm',
  'b': 'bomb', 'B': 'bomb',
  'x': 'missile', 'X': 'missile', 'm': 'missile', 'M': 'missile',
  'Escape': 'escape',
};

function normalize(e) {
  return KEYMAP[e.key] || e.key;
}

export function initInput() {
  window.addEventListener('keydown', (e) => {
    const k = normalize(e);
    if (['left', 'right', 'up', 'down', 'fire', 'confirm', 'bomb', 'missile'].includes(k)) {
      e.preventDefault();
    }
    if (!keys.has(k)) justPressed.add(k);
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(normalize(e));
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });
}

export function isDown(action) { return keys.has(action); }
export function isJustPressed(action) { return justPressed.has(action); }

export function consumeJustPressed() { justPressed.clear(); }

export function getAxis() {
  return {
    x: (isDown('right') ? 1 : 0) - (isDown('left') ? 1 : 0),
    y: (isDown('down') ? 1 : 0) - (isDown('up') ? 1 : 0),
  };
}

export function isFiring() { return isDown('fire'); }
