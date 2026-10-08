const sl = (key, label, min, max, step = 0.01, fmt = (v) => v.toFixed(2)) => ({ type: 'slider', key, label, min, max, step, fmt });

const GROUPS = [
  { title: 'image', open: true, items: [
    { type: 'seg', key: 'fit', options: [['contain', 'contain'], ['cover', 'cover']] },
    sl('zoom', 'size', 0.2, 4, 0.01, (v) => `${v.toFixed(2)}×`),
    sl('offsetX', 'position x', -1, 1, 0.005, (v) => v.toFixed(3)),
    sl('offsetY', 'position y', -1, 1, 0.005, (v) => v.toFixed(3)),
    sl('feather', 'edge fade', 0, 0.5, 0.005, (v) => v.toFixed(3)),
    sl('pixelSize', 'pixel size', 1, 8, 1, (v) => v)
  ] },
  { title: 'text', open: true, items: [
    sl('uiBottom', 'position y (from bottom)', 0, 45, 0.5, (v) => `${v}vh`),
    sl('uiScale', 'size', 0.6, 1.6)
  ] },
  { title: 'colors', open: true, items: [
    { type: 'color', key: 'inkColor', label: 'page' },
    { type: 'color', key: 'paperColor', label: 'dots' }
  ] },
  { title: 'cursor', open: true, items: [
    sl('revealMono', 'photo: color → b&w', 0, 1),
    sl('revealRadius', 'size', 50, 600, 5, (v) => `${v}px`),
    sl('softness', 'softness', 0, 1),
    sl('linger', 'trail', 0, 3)
  ] },
  { title: 'background', open: true, items: [
    { type: 'seg', key: 'bg', options: [[true, 'waves on'], [false, 'waves off']] },
    sl('bgStrength', 'density', 0, 1),
    sl('bgSpeed', 'speed', 0, 0.3, 0.005, (v) => v.toFixed(3)),
    sl('bgScale', 'wave size', 0.3, 4),
    sl('bgFrequency', 'detail', 1, 5, 0.05),
    sl('bgAmplitude', 'roughness', 0.05, 0.7),
    sl('bgBlend', 'blend with image', 0, 1),
    sl('bgReact', 'cursor glow', 0, 1),
    { type: 'color', key: 'bgColor', label: 'wave color' }
  ] }
];

export default function RegisterPanel({ cfg, setCfg, base }) {
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const copy = () => navigator.clipboard.writeText(JSON.stringify(cfg, null, 2));

  return (
    <aside className="panel register-panel">
      {GROUPS.map((g) => (
        <details key={g.title} open={g.open}>
          <summary>{g.title}</summary>
          {g.items.map((i) =>
            i.type === 'seg' ? (
              <div className="seg" role="group" aria-label={i.key} key={i.key}>
                {i.options.map(([val, text]) => (
                  <button key={String(val)} className={cfg[i.key] === val ? 'on' : ''} onClick={() => set({ [i.key]: val })}>
                    {text}
                  </button>
                ))}
              </div>
            ) : i.type === 'color' ? (
              <label key={i.key}>
                {i.label} <span>{cfg[i.key]}</span>
                <input type="color" value={cfg[i.key]} onChange={(e) => set({ [i.key]: e.target.value })}
                       style={{ width: '100%', height: 28, padding: 0, border: 0, background: 'none' }} />
              </label>
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
      <div className="seg">
        <button onClick={() => setCfg(base)}>reset</button>
        <button onClick={copy}>copy settings</button>
      </div>
    </aside>
  );
}
