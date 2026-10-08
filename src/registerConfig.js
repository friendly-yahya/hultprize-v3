// Locked look for the register page. Tune live with http://localhost:5173/?controls#register
// (use "copy settings", paste here).
export const REGISTER_IMAGE = {
  // image
  fit: 'contain', // 'contain' shows the whole image, 'cover' fills the screen
  zoom: 0.44, // 1 = fitted size, 2 = twice as big
  offsetX: 0, // -1 .. 1, fraction of screen width (positive = right)
  offsetY: 0.17, // -1 .. 1, fraction of screen height (positive = up)
  feather: 0.22, // 0 = hard edges, up to 0.5 = fades from the edges toward the center
  pixelSize: 2, // dither dot size, shared by the image and the background

  // title, line and buttons
  uiBottom: 13, // distance of the text block from the bottom of the screen, in vh (higher = moves up)
  uiScale: 1, // size of the text block, 1 = normal

  // colors
  inkColor: '#000000', // the page / empty areas
  paperColor: '#f4f1ea', // the dots

  // cursor
  revealMono: 1, // cursor reveal: 0 = original photo colors, 1 = black and white in the dither colors
  revealRadius: 50, // cursor reveal size in px
  softness: 0.89, // soft edge of the cursor reveal
  linger: 1.61, // seconds the reveal trail lingers

  // dithered wave background
  bg: false,
  bgStrength: 0.55, // how dense the dots get
  bgSpeed: 0.04, // 0 = still
  bgScale: 1, // bigger = larger, calmer waves
  bgFrequency: 3, // detail layers
  bgAmplitude: 0.3, // roughness of the detail
  bgBlend: 1, // 0 = image covers the waves, 1 = waves show through the image's dark areas
  bgColor: '#000000',
  bgReact: 1 // 0 = cursor ignores the waves, 1 = waves light up strongly around the cursor
};

// applied on top of the above on phones (max-width: 640px): bigger image,
// a reveal sized for a fingertip (dots stay 2px). Tune with ?controls on a phone-width window,
// then paste "copy settings" here.
export const REGISTER_MOBILE = {
  zoom: 0.85,
  offsetY: 0.1,
  uiBottom: 4,
  revealRadius: 90
};
