(function () {
  "use strict";
  var root = document.documentElement;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id) { return document.getElementById(id); }

  /* theme */
  $("theme-btn").addEventListener("click", function () {
    var t = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", t);
    try { localStorage.setItem("xray-theme", t); } catch (e) {}
  });

  /* ---------- the skeleton: sample-react-app/src, read from the repo ---------- */
  var NODES = [
    { id: "main", f: "main.tsx", t: "entry", x: 260, y: 48, l: 13 },
    { id: "App", f: "App.tsx", t: "component", x: 260, y: 140, l: 23 },
    { id: "Header", f: "Header.tsx", t: "component", x: 70, y: 250, l: 13 },
    { id: "Home", f: "Home.tsx", t: "page", x: 190, y: 250, l: 14 },
    { id: "About", f: "About.tsx", t: "page", x: 330, y: 250, l: 8 },
    { id: "Users", f: "Users.tsx", t: "page", x: 450, y: 250, l: 35 },
    { id: "useCounter", f: "useCounter.ts", t: "hook", x: 190, y: 352, l: 11 },
    { id: "A", f: "circularA.ts", t: "util", x: 92, y: 470, l: 6, warn: "cycle" },
    { id: "B", f: "circularB.ts", t: "util", x: 252, y: 470, l: 6, warn: "cycle" },
    { id: "orphan", f: "orphanedHelper.ts", t: "util", x: 422, y: 470, l: 10, warn: "orphan" }
  ];
  var EDGES = [["main", "App"], ["App", "Header"], ["App", "Home"], ["App", "About"], ["App", "Users"], ["Home", "useCounter"], ["A", "B", 1], ["B", "A", 1]];
  var BY = {}; NODES.forEach(function (n) { n.w = Math.max(104, n.f.length * 8.4 + 22); BY[n.id] = n; });
  var H = 540, SCAN = reduced ? 0 : 2600;

  function edgePath(e) {
    var a = BY[e[0]], b = BY[e[1]];
    if (e[2]) { // the cycle: two arcs between A and B
      var top = e[0] === "A";
      var y = top ? a.y - 19 : a.y + 19, cy = top ? a.y - 62 : a.y + 62;
      var x1 = a.x + (top ? 18 : -18), x2 = b.x + (top ? -18 : 18);
      return "M" + x1 + " " + y + " C" + x1 + " " + cy + " " + x2 + " " + cy + " " + x2 + " " + y;
    }
    var y1 = a.y + 19, y2 = b.y - 19, m = (y1 + y2) / 2;
    return "M" + a.x + " " + y1 + " C" + a.x + " " + m + " " + b.x + " " + m + " " + b.x + " " + y2;
  }
  function drawSkeleton() {
    var s = '<defs><marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#7fe3ff"/></marker>' +
      '<marker id="arrw" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#ffb547"/></marker></defs>';
    // faint film grid
    for (var gy = 30; gy < H; gy += 60) s += '<line x1="0" x2="520" y1="' + gy + '" y2="' + gy + '" stroke="rgba(127,227,255,.04)"/>';
    EDGES.forEach(function (e, i) {
      s += '<path class="edge' + (e[2] ? " warn flow" : "") + '" data-e="' + i + '" d="' + edgePath(e) + '" marker-end="url(#' + (e[2] ? "arrw" : "arr") + ')"/>';
    });
    NODES.forEach(function (n) {
      s += '<g class="bone' + (n.warn ? " warn" : "") + '" data-n="' + n.id + '" tabindex="0" role="button" aria-label="' + n.f + '">' +
        '<rect x="' + (n.x - n.w / 2) + '" y="' + (n.y - 19) + '" width="' + n.w + '" height="38" rx="9"/>' +
        '<text x="' + n.x + '" y="' + (n.y + 1) + '">' + n.f + '</text>' +
        '<text class="sub" x="' + n.x + '" y="' + (n.y + 14) + '">' + n.t + "</text></g>";
    });
    // findings tags
    s += '<g class="tag" id="tag-cycle"><text x="172" y="530" text-anchor="middle">import cycle</text></g>';
    s += '<g class="tag" id="tag-orphan"><circle class="pulse" cx="422" cy="470" r="44"/><text x="422" y="530" text-anchor="middle">nothing imports this</text></g>';
    $("skeleton").innerHTML = s;
  }
  drawSkeleton();

  var film = $("hero-film"), body = film.querySelector(".film-body");
  function setH() { body.style.setProperty("--h", body.clientHeight + "px"); }
  setH(); addEventListener("resize", setH);

  function runScan() {
    var svg = $("skeleton");
    svg.querySelectorAll(".bone, .edge, .tag").forEach(function (el) { el.classList.remove("lit"); });
    $("scan-state").textContent = "scanning"; $("scan-state").classList.remove("done");
    film.classList.remove("idle"); film.classList.remove("scanning"); void film.offsetWidth; film.classList.add("scanning");
    NODES.forEach(function (n) {
      setTimeout(function () { svg.querySelector('[data-n="' + n.id + '"]').classList.add("lit"); }, SCAN * (n.y + 19) / H);
    });
    EDGES.forEach(function (e, i) {
      var y = Math.max(BY[e[0]].y, BY[e[1]].y) + 19;
      setTimeout(function () { svg.querySelector('[data-e="' + i + '"]').classList.add("lit"); }, SCAN * y / H + 120);
    });
    setTimeout(function () {
      $("tag-cycle").classList.add("lit"); $("tag-orphan").classList.add("lit");
      $("scan-state").textContent = "scan complete, 3 findings"; $("scan-state").classList.add("done");
    }, SCAN + 200);
  }
  runScan();
  // a slow idle sweep every so often, purely cosmetic
  if (!reduced) setInterval(function () {
    if (document.hidden || film.matches(":hover")) return;
    film.classList.remove("scanning", "idle"); void film.offsetWidth; film.classList.add("idle");
  }, 9000);

  /* hover a module: its imports and importers */
  var tip = $("node-tip");
  function focusNode(id, el) {
    var svg = $("skeleton"), n = BY[id];
    var out = EDGES.filter(function (e) { return e[0] === id; }).map(function (e) { return BY[e[1]].f; });
    var inn = EDGES.filter(function (e) { return e[1] === id; }).map(function (e) { return BY[e[0]].f; });
    svg.querySelectorAll(".bone").forEach(function (g) {
      var gid = g.dataset.n, rel = gid === id || EDGES.some(function (e) { return (e[0] === id && e[1] === gid) || (e[1] === id && e[0] === gid); });
      g.classList.toggle("dim", !rel); g.classList.toggle("hot", gid === id);
    });
    svg.querySelectorAll(".edge").forEach(function (p) {
      var e = EDGES[+p.dataset.e], rel = e[0] === id || e[1] === id;
      p.classList.toggle("dim", !rel); p.classList.toggle("hot", rel);
    });
    var html = "<b>" + n.f + "</b> <span>" + n.t + ", " + n.l + " lines</span><br>" +
      "imports: " + (out.length ? out.join(", ") : "<span>nothing local</span>") + "<br>" +
      "imported by: " + (inn.length ? inn.join(", ") : (id === "main" ? "<span>entry point</span>" : '<span class="w">nobody</span>'));
    if (n.warn === "cycle") html += '<br><span class="w">part of an import cycle</span>';
    if (n.warn === "orphan") html += '<br><span class="w">orphaned: safe to delete or wire up</span>';
    tip.innerHTML = html; tip.hidden = false;
    var fr = film.getBoundingClientRect(), r = el.getBoundingClientRect();
    var left = Math.min(Math.max(r.left - fr.left + r.width / 2 - 120, 8), fr.width - 248);
    var top = r.top - fr.top + r.height + 8;
    if (top + tip.offsetHeight + 8 > fr.height) top = r.top - fr.top - tip.offsetHeight - 8;
    tip.style.left = left + "px"; tip.style.top = top + "px";
  }
  function clearFocus() {
    tip.hidden = true;
    $("skeleton").querySelectorAll(".dim, .hot").forEach(function (el) { el.classList.remove("dim", "hot"); });
  }
  $("skeleton").addEventListener("mouseover", function (e) { var g = e.target.closest(".bone"); if (g) focusNode(g.dataset.n, g); });
  $("skeleton").addEventListener("mouseleave", clearFocus);
  $("skeleton").addEventListener("focusin", function (e) { var g = e.target.closest(".bone"); if (g) focusNode(g.dataset.n, g); });
  $("skeleton").addEventListener("focusout", clearFocus);
  $("skeleton").addEventListener("click", function (e) { var g = e.target.closest(".bone"); if (g) focusNode(g.dataset.n, g); });

  /* reveal on scroll, count-up for the overview numbers */
  function countUp(el) {
    var to = +el.dataset.count, t0 = null;
    if (reduced) return;
    (function step(t) { if (!t0) t0 = t; var p = Math.min((t - t0) / 900, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); })(performance.now());
  }
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (ents) {
    ents.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add("in"); io.unobserve(en.target);
      en.target.querySelectorAll("[data-count]").forEach(countUp);
    });
  }, { threshold: .18 }) : null;
  document.querySelectorAll(".reveal, .lock").forEach(function (el, i) {
    if (io) { el.style.transitionDelay = (i % 3) * 80 + "ms"; io.observe(el); } else el.classList.add("in");
  });

  /* copy buttons */
  document.addEventListener("click", function (e) {
    var b = e.target.closest(".copy"); if (!b) return;
    var text = b.parentElement.querySelector("pre").textContent;
    function done() { b.textContent = "Copied"; b.classList.add("done"); setTimeout(function () { b.textContent = "Copy"; b.classList.remove("done"); }, 1400); }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {}); else done();
  });

  /* tab icon: the amber node flares when you come back to the tab */
  var fav = $("favicon"), base = fav.href;
  function icon(glow) {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#060c13" stroke="#1f3447" stroke-width="2"/>' +
      '<path d="M32 19V27M32 35L20 43M32 35L44 43" stroke="#7fe3ff" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="24" y="10" width="16" height="10" rx="3" fill="#7fe3ff"/><rect x="24" y="26" width="16" height="10" rx="3" fill="#7fe3ff"/><rect x="12" y="42" width="16" height="10" rx="3" fill="#7fe3ff"/>' +
      (glow ? '<circle cx="44" cy="47" r="' + (8 + glow * 4) + '" fill="#ffb547" opacity="' + (.45 - glow * .2) + '"/>' : "") +
      '<rect x="36" y="42" width="16" height="10" rx="3" fill="#ffb547"/></svg>';
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }
  var flaring = false;
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) { document.title = "Still scanning, React Codebase X-Ray"; return; }
    document.title = "React Codebase X-Ray";
    if (flaring || reduced) return; flaring = true;
    var f = 0, frames = [0.1, .5, 1, .5, .1, .5, 1, .5];
    var t = setInterval(function () {
      if (f >= frames.length) { clearInterval(t); fav.href = base; flaring = false; return; }
      fav.href = icon(frames[f++]);
    }, 220);
  });
})();
