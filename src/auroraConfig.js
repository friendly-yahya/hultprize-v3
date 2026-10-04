// Locked look. Tune live with http://localhost:5173/?controls (use "copy settings", paste here).
export const AURORA = {
  colorStops: ['#FFBE98', '#EC2088', '#4C7DFF'], // pastel orange, Hult pink, blue
  amplitude: 1,
  speed: 1,

  // ribbon
  ribbon: true,
  ribbonShape: 'sketch',
  ribbonWidth: 0.3,
  ribbonBend: 0.89,
  shapeMorph: 1.2,
  blend: 0.37,
  angle: 0,
  ribbonX: 0.07,
  ribbonY: 0,
  ribbonCrop: 0.7, // narrow screens crop the composition toward its right side instead of squeezing it

  // cursor blobs
  mouseMode: 'on',
  blobSoft: 0.09,
  mouseRadius: 0.16,
  mouseStrength: 0.82,
  mouseEase: 0.3,
  blobVisc: 1,

  // elastic pull
  pull: 0.56,
  pullRadius: 0.23,
  pullBounce: 0.43,

  // lava blobs
  lava: true,
  lavaCount: 6,
  lavaSize: 0.13,
  lavaSpeed: 1,
  lavaRange: 0.5,
  lavaSpread: 0.3,
  lavaX: 0,
  lavaY: 0.79,
  lavaSoft: 0.11,
  lavaPull: 0.81,

  // texture
  dither: true,
  pixelSize: 2,

  // drops render resolution automatically if the GPU can't keep up
  adaptive: true
};

// Applied automatically on portrait screens (phones). Sizes are in screen-height units,
// so on a narrow screen they have to shrink or the blobs swallow the whole width.
export const AURORA_PORTRAIT = {
  pixelSize: 2,
  mouseRadius: 0.1,
  lavaCount: 4,
  lavaSize: 0.085,
  lavaSpread: 0.12,
  lavaRange: 0.42,
  lavaX: 0.05,
  lavaY: 0.5,
  pullRadius: 0.2
};

// applied on top of AURORA on phones (max-width: 640px)
export const AURORA_MOBILE = { pixelSize: 3, lavaCount: 4 };
