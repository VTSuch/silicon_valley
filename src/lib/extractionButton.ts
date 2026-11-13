/**
 * THE EXTRACTION BUTTON — this file is the source of truth. Edit it here.
 *
 * It is a bookmarklet: JavaScript that runs INSIDE the Paraform results tab when you click it in
 * your bookmarks bar. It only reads the table (and clicks Paraform's own "Next page" like you
 * would), asks how many to extract, shows what it found, and downloads a CSV that you drop into
 * Outreach → Import CSV. It never touches LinkedIn.
 *
 * Setup → "Extraction button" builds the draggable link from EXTRACTION_BUTTON_HREF below.
 * Anyone dragging it from the site always gets the version that is deployed.
 *
 * Rules for editing the source string:
 *  - It must stay plain JavaScript (no TypeScript, no imports): the browser runs it as is.
 *  - Don't use backticks or ${...} inside it (it lives in a template literal); use '...' and +.
 *  - After a change, users re-drag the button from Setup to update their copy.
 *  - Paraform column layout is read in scrapeAll(): fix selectors there if Paraform changes.
 */
export const EXTRACTION_BUTTON_SOURCE = String.raw`(async function (scrapeAll) {
  if (window.__sqRunning) { alert('The extraction is already running.'); return; }
  var ans = prompt('How many candidates to extract? (empty = all)\nDo not touch the tab while it runs.', '10');
  if (ans === null) return;
  var max = parseInt(ans, 10) > 0 ? parseInt(ans, 10) : null;
  window.__sqRunning = true;
  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;z-index:2147483647;right:16px;bottom:16px;background:#111;color:#fff;padding:10px 14px;border-radius:8px;font:14px system-ui';
  document.body.appendChild(box);
  box.textContent = 'Extracting...';
  window.__sqProgress = function (p) {
    box.textContent = p.page
      ? 'Page ' + p.page + ' · ' + p.rows + (p.expected ? ' of ' + p.expected : '') + ' candidates'
      : 'Going back to page 1...';
  };
  try {
    var res = await scrapeAll(max);
    var rows = max ? res.rows.slice(0, max) : res.rows;
    if (!rows.length) {
      alert('No candidates with a LinkedIn link found.\nAre the results in table view?');
      return;
    }
    var preview = rows.slice(0, 10).map(function (r, i) {
      return (i + 1) + '. ' + r.name + ' — ' + r.title + ' @ ' + r.company;
    }).join('\n');
    var ok = confirm(
      rows.length + ' candidates extracted' +
      (res.noLink.length ? ' (' + res.noLink.length + ' without a LinkedIn link, skipped)' : '') +
      ':\n\n' + preview + (rows.length > 10 ? '\n...' : '') + '\n\nDownload the CSV?'
    );
    if (!ok) return;
    var q = function (v) {
      v = String(v == null ? '' : v);
      return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    var cols = ['name', 'company', 'title', 'location', 'tier', 'url'];
    var csv = ['name,company,title,location,tier,linkedin_url'].concat(
      rows.map(function (r) { return cols.map(function (c) { return q(r[c]); }).join(','); })
    ).join('\n') + '\n';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'candidates-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return csv;
  } finally {
    window.__sqRunning = false;
    box.remove();
  }
})(async function scrapeAll(max) {
  // Runs inside the Paraform tab. Reads the results table page by page.
  var t = function (s) { return (s || '').replace(/\s+/g, ' ').trim(); };
  var txt = function (el) { return (el ? (el.innerText !== undefined ? el.innerText : el.textContent) : '') || ''; };
  var report = function (m) { try { if (window.__sqProgress) window.__sqProgress(m); } catch (e) {} };
  var rowEls = function () {
    return Array.prototype.filter.call(document.querySelectorAll('[role=row]'), function (r) {
      return r.querySelector('[role=cell]');
    });
  };
  var ext = function () {
    return rowEls().map(function (r) {
      var a = r.querySelector('a[href*="linkedin.com/in/"]');
      var c = r.querySelectorAll('[role=cell]');
      var L = txt(c[0]).split('\n').map(t).filter(Boolean);
      return {
        name: L[0] || '',
        tier: L.find(function (x) { return / tier$/.test(x); }) || '',
        location: L[L.length - 1] || '',
        title: t(txt(c[1])),
        company: t(txt(c[2])),
        url: a ? a.href.split('?')[0] : ''
      };
    });
  };
  var sig = function () {
    var r = ext();
    return r.length ? [r[0].name, r[0].url, r[r.length - 1].name, r[r.length - 1].url, r.length].join('|') : '';
  };
  var btn = function (l) {
    return Array.prototype.find.call(document.querySelectorAll('button'), function (b) {
      return b.getAttribute('aria-label') === l;
    });
  };
  var off = function (b) { return !b || b.disabled || b.getAttribute('aria-disabled') === 'true'; };
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var go = async function (l) {
    var b = btn(l);
    for (var i = 0; i < 8 && off(b); i++) { await sleep(250); b = btn(l); }
    if (off(b)) return false;
    var s0 = sig();
    b.click();
    for (var j = 0; j < 60; j++) {
      await sleep(250);
      var n = sig();
      if (n && n !== s0) { await sleep(300); return true; }
    }
    return false;
  };
  var body = txt(document.body) || '';
  var m = body.match(/of\s+([\d,]+)\s+matches/i) || body.match(/Showing\s+[\d,]+\s*[–-]\s*[\d,]+\s+of\s+([\d,]+)/i);
  var expected = m ? parseInt(m[1].replace(/,/g, ''), 10) : null;

  window.__sqStop = false;
  var all = [], seen = {}, noLink = {};
  var pages = 0;
  report({ stage: 'back to page 1', expected: expected });
  while (!window.__sqStop && await go('Previous page')) {}
  do {
    pages++;
    ext().forEach(function (r) {
      if (r.url) { if (!seen[r.url]) { seen[r.url] = 1; all.push(r); } }
      else noLink[r.name] = 1;
    });
    report({ stage: 'extracting', page: pages, rows: all.length, expected: expected });
  } while (!window.__sqStop && pages < 80 && !(max && all.length >= max) && await go('Next page'));
  return { rows: all, pages: pages, expected: expected, noLink: Object.keys(noLink) };
});`

/** The link the user drags to the bookmarks bar. */
export const EXTRACTION_BUTTON_HREF = 'javascript:' + encodeURIComponent(EXTRACTION_BUTTON_SOURCE)
