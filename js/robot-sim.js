// Hero simulation: a robot explores an unseen world with a spinning LiDAR,
// builds a topological map online (with loop closures), and drives to
// wherever the visitor clicks. Obstacles are only visible through LiDAR hits.
(function () {
    const stage = document.getElementById('hero-stage');
    const canvas = document.getElementById('sim-canvas');
    if (!stage || !canvas) return;

    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hud = {
        mode: document.getElementById('hud-mode'),
        pose: document.getElementById('hud-pose'),
        nodes: document.getElementById('hud-nodes'),
        loops: document.getElementById('hud-loops')
    };

    const ROBOT_R = 9;
    const NODE_SPACING = 72;
    const LOOP_RADIUS = 48;
    const RAYS_PER_FRAME = 14;
    const RAY_COUNT = 180;          // angular resolution of one full LiDAR revolution
    const MAX_POINTS = 5000;

    let W = 0, H = 0, DPR = 1;
    let range = 240;
    let circles = [], segments = [];
    let robot, goal, userGoal, pointer;
    let points = new Map();          // grid-keyed LiDAR hits -> {x, y, t}
    let nodes = [], edges = [], currentNode = null, loopClosures = 0, loopFlashes = [];
    let trail = [];
    let sweep = 0;
    let lastProgress = { d: Infinity, t: 0 };
    let colors = {};
    let running = false, visible = true, rafId = null, lastHud = 0;

    // ---------- helpers ----------
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const now = () => performance.now();

    function readColors() {
        const cs = getComputedStyle(document.documentElement);
        const get = name => cs.getPropertyValue(name).trim() || '63, 224, 255';
        colors = {
            hit: get('--sim-hit'),
            ray: get('--sim-ray'),
            node: get('--sim-node'),
            robot: get('--sim-robot'),
            trail: get('--sim-trail')
        };
    }
    const rgba = (rgb, a) => `rgba(${rgb}, ${a})`;

    // ---------- world ----------
    function buildWorld() {
        circles = [];
        segments = [];
        const add = (x1, y1, x2, y2) => segments.push({ x1, y1, x2, y2 });

        // Boundary walls, slightly inset so hits read as a room outline
        const m = 14;
        add(m, m, W - m, m); add(W - m, m, W - m, H - m);
        add(W - m, H - m, m, H - m); add(m, H - m, m, m);

        const start = { x: W * 0.74, y: H * 0.5 };
        const area = W * H;
        const nCircles = Math.round(clamp(area / 70000, 6, 16));
        const nBoxes = Math.round(clamp(area / 140000, 3, 8));
        const farFromStart = (x, y, r) => Math.hypot(x - start.x, y - start.y) > r + 70;

        for (let i = 0, tries = 0; i < nCircles && tries < 400; tries++) {
            const r = rand(14, 42), x = rand(r + 30, W - r - 30), y = rand(r + 30, H - r - 30);
            if (!farFromStart(x, y, r)) continue;
            if (circles.some(c => Math.hypot(c.x - x, c.y - y) < c.r + r + 50)) continue;
            circles.push({ x, y, r });
            i++;
        }

        for (let i = 0, tries = 0; i < nBoxes && tries < 400; tries++) {
            const w = rand(40, 130), h = rand(16, 60), a = rand(0, Math.PI);
            const cx = rand(80, W - 80), cy = rand(80, H - 80);
            const rad = Math.hypot(w, h) / 2;
            if (!farFromStart(cx, cy, rad)) continue;
            if (circles.some(c => Math.hypot(c.x - cx, c.y - cy) < c.r + rad + 30)) continue;
            const ca = Math.cos(a), sa = Math.sin(a);
            const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
                .map(([px, py]) => ({ x: cx + px * ca - py * sa, y: cy + px * sa + py * ca }));
            for (let k = 0; k < 4; k++) {
                const p = corners[k], q = corners[(k + 1) % 4];
                add(p.x, p.y, q.x, q.y);
            }
            i++;
        }

        robot = { x: start.x, y: start.y, th: Math.PI, v: 0 };
        goal = null;
        userGoal = false;
        points = new Map();
        nodes = []; edges = []; loopFlashes = []; trail = [];
        loopClosures = 0;
        currentNode = addNode(robot.x, robot.y);
        pickRandomGoal();
    }

    function isFree(x, y, margin) {
        if (x < 40 || y < 40 || x > W - 40 || y > H - 40) return false;
        for (const c of circles) if (Math.hypot(c.x - x, c.y - y) < c.r + margin) return false;
        for (const s of segments) if (distToSeg(x, y, s).d < margin) return false;
        return true;
    }

    function pickRandomGoal() {
        for (let i = 0; i < 60; i++) {
            const x = rand(60, W - 60), y = rand(60, H - 60);
            // prefer goals that push exploration: far from robot
            if (Math.hypot(x - robot.x, y - robot.y) < Math.min(W, H) * 0.3) continue;
            if (isFree(x, y, 28)) { setGoal(x, y, false); return; }
        }
        setGoal(W * 0.5, H * 0.5, false);
    }

    function setGoal(x, y, fromUser) {
        goal = { x, y, t: now() };
        userGoal = fromUser;
        lastProgress = { d: Infinity, t: now() };
    }

    // ---------- geometry ----------
    function distToSeg(px, py, s) {
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
        const len2 = dx * dx + dy * dy || 1;
        const t = clamp(((px - s.x1) * dx + (py - s.y1) * dy) / len2, 0, 1);
        const cx = s.x1 + t * dx, cy = s.y1 + t * dy;
        return { d: Math.hypot(px - cx, py - cy), cx, cy };
    }

    function castRay(ox, oy, ang, maxD) {
        const dx = Math.cos(ang), dy = Math.sin(ang);
        let best = maxD;
        for (const s of segments) {
            const ex = s.x2 - s.x1, ey = s.y2 - s.y1;
            const den = dx * ey - dy * ex;
            if (Math.abs(den) < 1e-9) continue;
            const t = ((s.x1 - ox) * ey - (s.y1 - oy) * ex) / den;
            const u = ((s.x1 - ox) * dy - (s.y1 - oy) * dx) / den;
            if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
        }
        for (const c of circles) {
            const fx = ox - c.x, fy = oy - c.y;
            const b = fx * dx + fy * dy;
            const cc = fx * fx + fy * fy - c.r * c.r;
            const disc = b * b - cc;
            if (disc < 0) continue;
            const t = -b - Math.sqrt(disc);
            if (t > 0 && t < best) best = t;
        }
        return best;
    }

    function lineOfSight(a, b) {
        const d = Math.hypot(b.x - a.x, b.y - a.y);
        return castRay(a.x, a.y, Math.atan2(b.y - a.y, b.x - a.x), d) >= d - 1;
    }

    // ---------- topological map ----------
    function addNode(x, y) {
        const n = { x, y, id: nodes.length, born: now() };
        nodes.push(n);
        return n;
    }

    function hasEdge(a, b) {
        return edges.some(e => (e.a === a && e.b === b) || (e.a === b && e.b === a));
    }

    function updateTopology() {
        if (Math.hypot(robot.x - currentNode.x, robot.y - currentNode.y) < NODE_SPACING * 0.55) return;

        // Revisit? -> loop closure to an older node
        let nearest = null, nd = Infinity;
        for (const n of nodes) {
            if (n === currentNode) continue;
            const d = Math.hypot(n.x - robot.x, n.y - robot.y);
            if (d < nd) { nd = d; nearest = n; }
        }
        if (nearest && nd < LOOP_RADIUS && lineOfSight(robot, nearest)) {
            if (!hasEdge(currentNode, nearest)) {
                edges.push({ a: currentNode, b: nearest, loop: currentNode.id - nearest.id > 3, born: now() });
                if (currentNode.id - nearest.id > 3) {
                    loopClosures++;
                    loopFlashes.push({ x: nearest.x, y: nearest.y, t: now() });
                }
            }
            currentNode = nearest;
            return;
        }

        if (Math.hypot(robot.x - currentNode.x, robot.y - currentNode.y) >= NODE_SPACING) {
            const n = addNode(robot.x, robot.y);
            edges.push({ a: currentNode, b: n, loop: false, born: now() });
            currentNode = n;
        }
    }

    // ---------- control ----------
    function step(dt) {
        if (!goal) pickRandomGoal();

        const gx = goal.x - robot.x, gy = goal.y - robot.y;
        const gd = Math.hypot(gx, gy);

        if (gd < 16) {
            goal = null;
            userGoal = false;
            pickRandomGoal();
            return;
        }

        // Attractive force to the goal
        let fx = gx / gd, fy = gy / gd;

        // Repulsion from nearby obstacles, plus a tangential term to slide around them
        let minClear = Infinity;
        const influence = 70;
        const repel = (ox, oy, d) => {
            minClear = Math.min(minClear, d);
            if (d >= influence) return;
            const k = Math.pow((influence - d) / influence, 2) * 2.4;
            const nx = (robot.x - ox) / (d + ROBOT_R + 1e-6), ny = (robot.y - oy) / (d + ROBOT_R + 1e-6);
            fx += nx * k; fy += ny * k;
            // tangent that agrees with the goal direction
            let tx = -ny, ty = nx;
            if (tx * gx + ty * gy < 0) { tx = -tx; ty = -ty; }
            fx += tx * k * 0.7; fy += ty * k * 0.7;
        };
        for (const c of circles) {
            const d = Math.hypot(robot.x - c.x, robot.y - c.y) - c.r - ROBOT_R;
            repel(c.x, c.y, Math.max(d, 0.1));
        }
        for (const s of segments) {
            const r = distToSeg(robot.x, robot.y, s);
            repel(r.cx, r.cy, Math.max(r.d - ROBOT_R, 0.1));
        }

        // Steer towards the resulting direction with a bounded turn rate
        const desired = Math.atan2(fy, fx);
        let dth = desired - robot.th;
        dth = Math.atan2(Math.sin(dth), Math.cos(dth));
        robot.th += clamp(dth, -3.2 * dt, 3.2 * dt);

        const speedCap = 95 * clamp(minClear / 45, 0.25, 1) * (Math.abs(dth) > 1.2 ? 0.35 : 1);
        robot.v += (speedCap - robot.v) * Math.min(1, dt * 4);

        const nx = robot.x + Math.cos(robot.th) * robot.v * dt;
        const ny = robot.y + Math.sin(robot.th) * robot.v * dt;
        if (isFreeForRobot(nx, ny)) {
            robot.x = nx; robot.y = ny;
        } else {
            robot.v *= 0.3;
            robot.th += (Math.random() - 0.5) * 1.2;
        }

        // Stuck detection -> replan to a new exploration goal
        if (gd < lastProgress.d - 20) lastProgress = { d: gd, t: now() };
        else if (now() - lastProgress.t > 3500) {
            if (userGoal) userGoal = false;
            pickRandomGoal();
        }

        trail.push({ x: robot.x, y: robot.y });
        if (trail.length > 420) trail.shift();

        updateTopology();
    }

    function isFreeForRobot(x, y) {
        if (x < ROBOT_R + 16 || y < ROBOT_R + 16 || x > W - ROBOT_R - 16 || y > H - ROBOT_R - 16) return false;
        for (const c of circles) if (Math.hypot(c.x - x, c.y - y) < c.r + ROBOT_R) return false;
        for (const s of segments) if (distToSeg(x, y, s).d < ROBOT_R) return false;
        return true;
    }

    function scan(count) {
        const t = now();
        const fan = [];
        for (let i = 0; i < count; i++) {
            sweep = (sweep + 1) % RAY_COUNT;
            const ang = (sweep / RAY_COUNT) * Math.PI * 2;
            const d = castRay(robot.x, robot.y, ang, range);
            const hx = robot.x + Math.cos(ang) * d, hy = robot.y + Math.sin(ang) * d;
            fan.push({ x: hx, y: hy, hit: d < range });
            if (d < range) {
                const key = ((hx / 3) | 0) + ',' + ((hy / 3) | 0);
                points.delete(key);
                points.set(key, { x: hx, y: hy, t });
            }
        }
        while (points.size > MAX_POINTS) points.delete(points.keys().next().value);
        return fan;
    }

    // ---------- render ----------
    function draw(fan) {
        const t = now();
        ctx.clearRect(0, 0, W, H);

        // LiDAR point cloud: bright when fresh, settles to a persistent map
        for (const p of points.values()) {
            const age = (t - p.t) / 1000;
            const a = age < 0.6 ? 0.95 : Math.max(0.28, 0.9 - age * 0.05);
            ctx.fillStyle = rgba(colors.hit, a);
            ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
        }

        // Robot trail
        if (trail.length > 1) {
            ctx.lineWidth = 1;
            for (let i = 1; i < trail.length; i++) {
                ctx.strokeStyle = rgba(colors.trail, (i / trail.length) * 0.22);
                ctx.beginPath();
                ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
                ctx.lineTo(trail[i].x, trail[i].y);
                ctx.stroke();
            }
        }

        // Topological graph
        for (const e of edges) {
            ctx.strokeStyle = e.loop ? rgba(colors.robot, 0.75) : rgba(colors.node, 0.55);
            ctx.lineWidth = e.loop ? 1.6 : 1.2;
            ctx.setLineDash(e.loop ? [4, 4] : []);
            ctx.beginPath();
            ctx.moveTo(e.a.x, e.a.y);
            ctx.lineTo(e.b.x, e.b.y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        for (const n of nodes) {
            const grow = clamp((t - n.born) / 300, 0, 1);
            ctx.fillStyle = rgba(colors.node, 0.9);
            ctx.beginPath();
            ctx.arc(n.x, n.y, 3.2 * grow, 0, Math.PI * 2);
            ctx.fill();
            if (n === currentNode) {
                ctx.strokeStyle = rgba(colors.node, 0.9);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(n.x, n.y, 7, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        // Loop-closure flashes
        loopFlashes = loopFlashes.filter(f => t - f.t < 1400);
        for (const f of loopFlashes) {
            const k = (t - f.t) / 1400;
            ctx.strokeStyle = rgba(colors.robot, 1 - k);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 6 + k * 34, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = rgba(colors.robot, 1 - k);
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText('LOOP CLOSURE', f.x + 12, f.y - 12 - k * 10);
        }

        // LiDAR sweep fan
        if (fan && fan.length) {
            const grad = ctx.createRadialGradient(robot.x, robot.y, 0, robot.x, robot.y, range);
            grad.addColorStop(0, rgba(colors.ray, 0.22));
            grad.addColorStop(1, rgba(colors.ray, 0));
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.moveTo(robot.x, robot.y);
            for (const p of fan) ctx.lineTo(p.x, p.y);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = rgba(colors.hit, 1);
            for (const p of fan) if (p.hit) ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
        }

        // Sensor range ring
        ctx.strokeStyle = rgba(colors.ray, 0.08);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, range, 0, Math.PI * 2);
        ctx.stroke();

        // Goal reticle
        if (goal) {
            const pulse = (Math.sin(t / 250) + 1) / 2;
            const c = userGoal ? colors.robot : colors.node;
            ctx.strokeStyle = rgba(c, 0.9);
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(goal.x, goal.y, 9 + pulse * 3, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(goal.x - 16, goal.y); ctx.lineTo(goal.x - 6, goal.y);
            ctx.moveTo(goal.x + 6, goal.y); ctx.lineTo(goal.x + 16, goal.y);
            ctx.moveTo(goal.x, goal.y - 16); ctx.lineTo(goal.x, goal.y - 6);
            ctx.moveTo(goal.x, goal.y + 6); ctx.lineTo(goal.x, goal.y + 16);
            ctx.stroke();
            ctx.fillStyle = rgba(c, 0.9);
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText(userGoal ? 'GOAL · YOURS' : 'FRONTIER', goal.x + 14, goal.y + 22);

            // planned heading line
            ctx.setLineDash([2, 6]);
            ctx.strokeStyle = rgba(c, 0.35);
            ctx.beginPath();
            ctx.moveTo(robot.x, robot.y);
            ctx.lineTo(goal.x, goal.y);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Pointer crosshair
        if (pointer && t - pointer.t < 2500) {
            ctx.strokeStyle = rgba(colors.ray, 0.35);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, 5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Robot
        const glow = ctx.createRadialGradient(robot.x, robot.y, 0, robot.x, robot.y, 34);
        glow.addColorStop(0, rgba(colors.robot, 0.45));
        glow.addColorStop(1, rgba(colors.robot, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, 34, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(robot.x, robot.y);
        ctx.rotate(robot.th);
        ctx.fillStyle = rgba(colors.robot, 1);
        ctx.beginPath();
        ctx.moveTo(ROBOT_R + 5, 0);
        ctx.lineTo(-ROBOT_R + 1, -ROBOT_R + 1);
        ctx.lineTo(-ROBOT_R + 4, 0);
        ctx.lineTo(-ROBOT_R + 1, ROBOT_R - 1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    function updateHud() {
        if (!hud.mode) return;
        hud.mode.textContent = userGoal ? 'goal-seek' : 'explore';
        const deg = ((robot.th * 180 / Math.PI) % 360 + 360) % 360;
        hud.pose.textContent = `${(robot.x / 40).toFixed(1)}, ${(robot.y / 40).toFixed(1)} m · ${deg.toFixed(0)}°`;
        hud.nodes.textContent = nodes.length;
        hud.loops.textContent = loopClosures;
    }

    // ---------- loop ----------
    let lastT = 0;
    function frame(t) {
        rafId = null;
        if (!running) return;
        const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
        lastT = t;
        step(dt);
        const fan = scan(RAYS_PER_FRAME);
        draw(fan);
        if (t - lastHud > 150) { updateHud(); lastHud = t; }
        rafId = requestAnimationFrame(frame);
    }

    function start() {
        if (running || reduceMotion || !visible || document.hidden) return;
        running = true;
        lastT = performance.now();
        rafId = requestAnimationFrame(frame);
    }

    function stop() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
    }

    function resize() {
        const rect = stage.getBoundingClientRect();
        const newW = Math.round(rect.width), newH = Math.round(rect.height);
        if (newW === W && Math.abs(newH - H) < 80) return;
        W = newW; H = newH;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = W * DPR;
        canvas.height = H * DPR;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        range = clamp(Math.min(W, H) * 0.38, 150, 280);
        buildWorld();

        if (reduceMotion) {
            // Pre-run the simulation offline and show a single still frame
            for (let i = 0; i < 900; i++) { step(1 / 60); scan(RAYS_PER_FRAME); }
            draw(null);
            updateHud();
        }
    }

    // ---------- interaction ----------
    function localPoint(e) {
        const rect = stage.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    stage.addEventListener('pointermove', e => {
        const p = localPoint(e);
        pointer = { x: p.x, y: p.y, t: now() };
    });

    stage.addEventListener('click', e => {
        if (e.target.closest('a, button, input, .hero-portrait')) return;
        const p = localPoint(e);
        const x = clamp(p.x, 40, W - 40), y = clamp(p.y, 40, H - 40);
        setGoal(x, y, true);
        if (reduceMotion) { for (let i = 0; i < 400 && goal; i++) { step(1 / 60); scan(RAYS_PER_FRAME); } draw(null); updateHud(); }
    });

    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    document.addEventListener('themechange', readColors);

    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        visible ? start() : stop();
    }).observe(stage);

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);

    readColors();
    resize();
    start();
})();
