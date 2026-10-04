const onOff = (key, name) => ({ type: 'seg', key, options: [[true, `${name} on`], [false, `${name} off`]] });
const sl = (key, label, min, max, step = 0.01, fmt = (v) => v.toFixed(2)) => ({ type: 'slider', key, label, min, max, step, fmt });

const GROUPS = [
  { title: 'ribbon', open: true, items: [
    onOff('ribbon', 'ribbon'),
    { type: 'seg', key: 'ribbonShape', options: [['sketch', 'sketch'], ['band', 'band']], also: (v) => ({ angle: v === 'sketch' ? 0 : -20 }) },
    sl('ribbonWidth', 'thickness', 0.3, 2.5),
    sl('ribbonBend', 'bend', 0, 2),
    { ...sl('shapeMorph', 'morph', 0, 2), when: (c) => c.ribbonShape === 'sketch' },
    sl('blend', 'edge softness', 0.1, 1),
    sl('angle', 'rotation', -90, 90, 1, (v) => `${v}°`),
    sl('ribbonX', 'position x', -0.5, 0.5),
    sl('ribbonY', 'position y', -0.5, 0.5)
  ] },
  { title: 'blobs', open: true, items: [
    { type: 'seg', key: 'mouseMode', options: [['on', 'blobs on'], ['off', 'blobs off']] },
    sl('blobSoft', 'blur', 0, 1),
    sl('mouseRadius', 'size', 0.1, 0.6),
    sl('mouseStrength', 'strength', 0, 1.5),
    sl('mouseEase', 'follow speed', 0.01, 0.3),
    sl('blobVisc', 'viscosity', 0, 1)
  ] },
  { title: 'mouse pull', open: true, items: [
    sl('pull', 'pull', 0, 1.2),
    sl('pullRadius', 'reach', 0.15, 0.9),
    sl('pullBounce', 'bounce', 0, 1)
  ] },
  { title: 'lava blobs', open: true, items: [
    onOff('lava', 'lava'),
    sl('lavaCount', 'count', 1, 8, 1, (v) => v),
    sl('lavaSize', 'size', 0.04, 0.25),
    sl('lavaSpeed', 'speed', 0, 3),
    sl('lavaRange', 'travel', 0.05, 0.5),
    sl('lavaSpread', 'spread', 0.02, 0.3),
    sl('lavaSoft', 'goo blur', 0, 1),
    sl('lavaPull', 'pull influence', 0, 2),
    sl('lavaX', 'position x', 0, 0.5),
    sl('lavaY', 'position y', 0.2, 0.8)
  ] },
  { title: 'texture', items: [
    onOff('dither', 'dither'),
    sl('pixelSize', 'pixel size', 1, 8, 1, (v) => v)
  ] }
];

export default function Panel({ cfg, setCfg }) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const copy = () => navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));

  return (
    <aside className="panel">
      {GROUPS.map((g) => (
        <details key={g.title} open={g.open}>
          <summary>{g.title}</summary>
          {g.items.filter((i) => !i.when || i.when(cfg)).map((i) =>
            i.type === 'seg' ? (
              <div className="seg" role="group" aria-label={i.key} key={i.key}>
                {i.options.map(([val, text]) => (
                  <button key={String(val)} className={cfg[i.key] === val ? 'on' : ''}
                          onClick={() => set({ [i.key]: val, ...(i.also ? i.also(val) : {}) })}>
                    {text}
                  </button>
                ))}
              </div>
            ) : (
              <label key={i.key}>
                {i.label} <span>{i.fmt(cfg[i.key])}</span>
                <input type="range" min={i.min} max={i.max} step={i.step} value={cfg[i.key]}
                       onChange={(e) => set({ [i.key]: +e.target.value })} />
              </label>
            )
          )}
        </details>
      ))}
      <div className="seg"><button style={{ gridColumn: 'span 2' }} onClick={copy}>copy settings</button></div>
    </aside>
  );
}
