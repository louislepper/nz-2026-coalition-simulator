(async function () {
  const data = await fetch('data.json').then(r => r.json());
  const parties = data.parties.map(p => ({ ...p, total: p.electorate + p.list }));
  const TOTAL = data.totalSeats;
  const MAJORITY = Math.floor(TOTAL / 2) + 1;
  const DEFAULTS = { lab: 'left', grn: 'left', nat: 'right', act: 'right' };
  const STORAGE_KEY = 'nz2026-coalition-v2';

  const zones = {
    left: document.getElementById('zone-left'),
    none: document.getElementById('zone-none'),
    right: document.getElementById('zone-right'),
  };
  const ORDER = ['left', 'none', 'right'];

  document.getElementById('status').textContent = data.status;
  document.getElementById('total-seats').textContent = TOTAL;
  document.getElementById('majority').textContent = MAJORITY;

  let assignment = loadAssignment();

  function defaultAssignment() {
    return Object.fromEntries(parties.map(p => [p.id, DEFAULTS[p.id] || 'none']));
  }
  function loadAssignment() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && parties.every(p => ORDER.includes(saved[p.id]))) return saved;
    } catch (e) { /* ignore */ }
    return defaultAssignment();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(assignment)); } catch (e) { /* ignore */ }
  }

  function move(id, bloc) {
    assignment[id] = bloc;
    save();
    render();
  }

  function blocParties(bloc) {
    return parties.filter(p => assignment[p.id] === bloc);
  }
  function blocTotals(bloc) {
    const ps = blocParties(bloc);
    const sum = k => ps.reduce((a, p) => a + p[k], 0);
    return { electorate: sum('electorate'), list: sum('list'), total: sum('total'), votePct: sum('votePct') };
  }

  function makeCard(p) {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.id = p.id;
    card.style.setProperty('--swatch', p.colour);
    const bloc = assignment[p.id];
    const idx = ORDER.indexOf(bloc);
    card.innerHTML = `
      <div class="mv">
        <button type="button" data-dir="-1" title="Move left" ${idx === 0 ? 'disabled' : ''}>◀</button>
        <button type="button" data-dir="1" title="Move right" ${idx === 2 ? 'disabled' : ''}>▶</button>
      </div>
      <div>
        <div class="name">${p.name}</div>
        <div class="detail">${p.votePct.toFixed(2)}% party vote · ${p.electorate} electorate + ${p.list} list</div>
      </div>
      <div class="seats">${p.total}<small>seats</small></div>`;
    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', p.id);
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.querySelectorAll('.mv button').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const next = ORDER[idx + Number(btn.dataset.dir)];
        if (next) move(p.id, next);
      });
    });
    return card;
  }

  function renderZones() {
    ORDER.forEach(bloc => {
      zones[bloc].replaceChildren(...blocParties(bloc).map(makeCard));
      const t = blocTotals(bloc);
      document.getElementById('stats-' + bloc).textContent =
        t.total ? `${t.total} seats (${t.electorate} electorate + ${t.list} list) · ${t.votePct.toFixed(2)}% party vote` : 'No parties';
    });
  }

  function renderSummary() {
    const el = document.getElementById('summary');
    el.innerHTML = ['left', 'right'].map(bloc => {
      const t = blocTotals(bloc);
      const pct = (100 * t.total / TOTAL).toFixed(1);
      const names = blocParties(bloc).map(p => p.short).join(' + ') || '—';
      const has = t.total >= MAJORITY;
      const label = bloc === 'left' ? 'Coalition A' : 'Coalition B';
      return `<div class="bloc ${bloc}">
        <div class="muted">${label} · ${names}</div>
        <div class="big">${t.total} <span class="muted" style="font-size:1rem">/ ${TOTAL} · ${pct}%</span></div>
        <div class="muted">${t.electorate} electorate + ${t.list} list</div>
        <div class="majority ${has ? 'ok' : 'no'}">${has ? '✔ Majority' : `${MAJORITY - t.total} short of majority`}</div>
      </div>`;
    }).join('');
  }

  function renderHemicycle() {
    const svg = document.getElementById('hemicycle');
    const seats = [];
    const push = (ps, cls) => ps.forEach(p => { for (let i = 0; i < p.total; i++) seats.push({ colour: p.colour, cls, name: p.name }); });
    push(blocParties('left'), 'left');
    push(blocParties('none'), 'none');
    push(blocParties('right'), 'right');

    // Arrange seats in concentric half-rings, filled left-to-right by angle.
    const rows = 5;
    const cx = 200, cy = 200, rInner = 70, rOuter = 190;
    const positions = [];
    const perRow = [];
    let remaining = seats.length;
    const radii = Array.from({ length: rows }, (_, i) => rInner + (rOuter - rInner) * i / (rows - 1));
    const circumference = radii.reduce((a, r) => a + r, 0);
    radii.forEach((r, i) => {
      const n = i === rows - 1 ? remaining : Math.round(seats.length * r / circumference);
      perRow.push(n); remaining -= n;
    });
    radii.forEach((r, i) => {
      const n = perRow[i];
      for (let k = 0; k < n; k++) {
        const angle = n === 1 ? Math.PI / 2 : Math.PI - Math.PI * k / (n - 1);
        positions.push({ x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle), angle });
      }
    });
    positions.sort((a, b) => b.angle - a.angle);
    svg.replaceChildren(...positions.map((pos, i) => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', pos.x.toFixed(1)); c.setAttribute('cy', pos.y.toFixed(1)); c.setAttribute('r', 7);
      c.setAttribute('fill', seats[i].colour);
      c.setAttribute('opacity', seats[i].cls === 'none' ? 0.35 : 1);
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      t.textContent = seats[i].name; c.appendChild(t);
      return c;
    }));
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', cx); line.setAttribute('y1', cy - rInner + 10); line.setAttribute('x2', cx); line.setAttribute('y2', cy - rOuter - 10);
    line.setAttribute('stroke', 'currentColor'); line.setAttribute('stroke-dasharray', '3 3'); line.setAttribute('opacity', 0.5);
    svg.appendChild(line);
  }

  function render() { renderZones(); renderSummary(); renderHemicycle(); }

  ORDER.forEach(bloc => {
    const z = zones[bloc];
    z.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; z.classList.add('over'); });
    z.addEventListener('dragleave', () => z.classList.remove('over'));
    z.addEventListener('drop', e => {
      e.preventDefault(); z.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      if (id) move(id, bloc);
    });
  });

  document.getElementById('reset').addEventListener('click', () => { assignment = defaultAssignment(); save(); render(); });

  render();
})();
