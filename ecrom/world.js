/* Toy floor plan for the search demo. Histories are hand-set for the two teaser surfaces and seeded-random for the rest. */
(function (root) {
  const E = root.ECROM || require('./engine.js');
  const mk = a => a.map(([c, l]) => ({ c, level: l }));
  const rng = (function (s) { return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; })(7);
  const supports = [
    { name: 'Dining table', x: 95, y: 335, hist: mk([[1,0],[1,2],[0,0],[0,0],[1,2],[0,0],[1,0],[0,0],[1,0],[0,0]]) },
    { name: 'Kitchen island', x: 470, y: 300, hist: mk([[1,0],[1,2],[1,0],[1,0],[.75,0],[1,0],[1,2],[1,0],[.75,0],[1,0]]) },
    { name: 'Sofa side table', x: 540, y: 110 }, { name: 'Desk', x: 100, y: 95 },
    { name: 'Bookshelf', x: 290, y: 100 }, { name: 'Counter', x: 640, y: 340 },
    { name: 'TV console', x: 640, y: 175 }, { name: 'Entry bench', x: 300, y: 230 },
  ];
  supports.forEach((s, i) => {
    if (s.hist) return;
    s.hist = Array.from({ length: 10 }, () => ({ c: [.75, 1, 1][Math.floor(rng() * 3)], level: 0 }));
    if (i === 2) s.hist[3] = { c: 1, level: 1 };           // one weak false alarm
    if (i === 3) s.hist = mk([[0,0],[0,0],[.25,0],[0,0],[0,0],[0,0],[0,0],[.25,0],[0,0],[0,0]]);   // desk: barely ever seen
  });
  const views = [];
  [70, 220, 370, 520, 650].forEach(x => [70, 160, 250, 340].forEach(y => views.push({ x, y })));
  const start = { x: 400, y: 400 };
  root.WORLD = { supports, views, start };
  if (typeof module !== 'undefined') module.exports = root.WORLD;
})(typeof window !== 'undefined' ? window : globalThis);
