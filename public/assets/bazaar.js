/* Agent Bazaar progressive enhancement. The site works without this file:
   it only adds copy buttons, code tabs, the live probe and the mobile
   filter toggle. No third-party code, no tracking. */
(function () {
  "use strict";

  // Copy buttons: <button class="copy" data-copy-target="id">
  document.addEventListener("click", function (e) {
    var b = e.target.closest("button.copy");
    if (!b) return;
    var el = document.getElementById(b.getAttribute("data-copy-target"));
    if (!el || !navigator.clipboard) return;
    navigator.clipboard.writeText(el.innerText).then(function () {
      var t = b.textContent;
      b.textContent = "Copied";
      b.classList.add("done");
      setTimeout(function () { b.textContent = t; b.classList.remove("done"); }, 1400);
    });
  });

  // Tabs: .tabs > [role=tablist] > [role=tab][aria-controls]
  document.querySelectorAll(".tabs").forEach(function (box) {
    var tabs = box.querySelectorAll('[role="tab"]');
    if (!tabs.length) return;
    box.classList.add("js");
    box.querySelector('[role="tablist"]').hidden = false;
    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls"));
        if (p) p.hidden = !on;
      });
      if (focus) tab.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") select(tabs[(i + 1) % tabs.length], true);
        if (e.key === "ArrowLeft") select(tabs[(i - 1 + tabs.length) % tabs.length], true);
      });
    });
    select(tabs[0]);
  });

  // Live probe: <button data-probe="slug"> + <div id="probe-out">
  var pb = document.querySelector("[data-probe]");
  if (pb) {
    pb.hidden = false;
    pb.addEventListener("click", function () {
      var out = document.getElementById("probe-out");
      out.innerHTML = '<span class="skeleton"></span>';
      pb.disabled = true;
      fetch("/api/resources/" + encodeURIComponent(pb.getAttribute("data-probe")) + "/probe", { method: "POST", headers: { Accept: "application/json" } })
        .then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
        .then(function (res) {
          var j = res.j;
          out.textContent = "";
          function line(label, value, cls) {
            var d = document.createElement("div");
            d.textContent = label + value;
            if (cls) d.className = cls;
            out.appendChild(d);
          }
          if (res.s === 429) { line("", "Rate limited. Try again in a minute.", "bad"); return; }
          if (!j.probed) { line("", j.reason || "Could not probe.", ""); return; }
          line("GET ", j.url, "");
          line("HTTP ", String(j.httpStatus) + " in " + j.latencyMs + " ms", j.reachable ? "ok" : "bad");
          line("", j.detail, j.paymentRequirementsMatch ? "ok" : "");
          line("", "Nothing was paid. Checked " + j.checkedAt, "");
        })
        .catch(function () { out.textContent = "Probe failed to run."; })
        .finally(function () { pb.disabled = false; });
    });
  }

  // Mobile filters toggle
  var ft = document.querySelector("[data-filters-toggle]");
  if (ft) ft.addEventListener("click", function () {
    var f = document.getElementById("filters");
    var show = !f.classList.contains("show");
    f.classList.toggle("show", show);
    ft.setAttribute("aria-expanded", show ? "true" : "false");
  });

  // Auto-submit filter form on change (the Apply button still works without JS)
  var ff = document.getElementById("filters");
  if (ff) ff.addEventListener("change", function (e) {
    if (e.target.matches("select, input[type=checkbox]")) ff.submit();
  });
})();
