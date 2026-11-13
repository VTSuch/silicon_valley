# Guide for the AI: a Paraform extraction button that keeps the LinkedIn URLs

> **Para tu compañero (humano):** pega este archivo entero en tu IA (ChatGPT, Claude, etc.) y dile: *"Lee esta guía y ayúdame a montar esto paso a paso. Explícamelo como si no supiera programar."* La IA se encarga del resto y te preguntará antes de hacer nada opcional.

---

## 0. Instructions for the AI reading this

You are helping a **recruiter with no programming background**. Explain everything from zero, in plain language, one step at a time, and wait for confirmation before moving on. Answer in the user's language (probably Spanish).

The user currently copies candidate data from Paraform and pastes it into a GPT to get a table. **That loses the LinkedIn URL**, and this guide fixes exactly that. Part 1 to 6 is the core and you should do it. **Part 7 is optional: do NOT build it on your own. Describe each option briefly and ask the user whether they want it.**

**Hard rule, never break it:** do not automate anything on LinkedIn (no auto-clicking Connect, no auto-sending notes or messages, no scripts running on linkedin.com). It violates LinkedIn's User Agreement and puts the recruiter's account (especially a paid Recruiter account) at risk. Everything on LinkedIn is done by the human, by hand. The tools below only prepare things and only ever read the **Paraform** page.

---

## 1. Why the LinkedIn URL gets lost

In Paraform's results, the small **"in"** icon next to each candidate is a hyperlink (an `<a href="https://www.linkedin.com/in/...">` element). When you select and copy the text of the page, you copy only what you can *read*; the address behind the icon is not text, so it is dropped. A GPT can't recover it because it never received it.

The fix: run a small piece of JavaScript **inside the Paraform page** that reads the underlying HTML, where the real URL is, and writes everything (name, title, company, location, LinkedIn URL) into a CSV file.

**It only works in Paraform's TABLE view** (rows and columns). In card/list views the markup is different and the code below will not find the rows. If the user has another view, ask them to switch to the table view first.

## 2. What a "bookmarklet" is (explain this to the user)

A bookmarklet is a normal Chrome bookmark, but instead of a web address it stores a few lines of JavaScript (it starts with `javascript:`). When you click it, Chrome runs that code **on the page you are looking at**. That's all: no extension store, no installation, nothing runs in the background. It lives in the bookmarks bar as a button, and it only does something when the user clicks it.

## 3. How Paraform's table is built (what the code reads)

The code relies on these facts about the table view. If Paraform changes its HTML one day, these are the things to re-check (right click, Inspect, look at one row):

- Every candidate is an element with `role="row"` that contains elements with `role="cell"`.
- **Cell 0**: several lines of text. First line = full name; one line like "S tier"; last line = location. The row also contains the link: `a[href*="linkedin.com/in/"]` (the "in" icon). Its `href` is the LinkedIn URL (strip anything after `?`).
- **Cell 1**: job title. **Cell 2**: company.
- Pagination: buttons with `aria-label="Next page"` and `aria-label="Previous page"`. The code clicks "Next page" exactly as the user would, waits until the rows change, and reads the next page.
- The page shows a text like "... of 400 matches", used for the progress message.

If it finds nothing, the likely cause is the user is not in table view, or Paraform changed. In that case ask the user to right click one candidate row, choose Inspect, and paste the surrounding HTML; then adjust the selectors inside `scrapeAll`.

## 4. The code (plain JavaScript, ready to use)

This is the exact code that works today. Do not rewrite it from memory; use it as is and only adapt if something fails. It asks how many candidates to extract (e.g. 10, or empty for all), stops paging as soon as it has that many, shows a preview and **asks for confirmation before downloading** a CSV.

```javascript
(async function (scrapeAll) {
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
});
```

The CSV it downloads has these columns, one candidate per row:

```
name,company,title,location,tier,linkedin_url
```

and the `linkedin_url` is the real LinkedIn profile address. That CSV can be opened in Excel/Sheets or given to a GPT/other tool, and now it contains the URL.

## 5. Installing it in Chrome (once per Chrome)

Chrome needs the code turned into a bookmark address: `javascript:` followed by the code URL-encoded. The simplest reliable way for a non-technical user is a tiny local web page with a draggable button. Create a file called `install-button.html` (on the Desktop, for example), with this content, **pasting the code from section 4 between the backticks of `CODE`** (the script handles the encoding):

```html
<!doctype html>
<meta charset="utf-8">
<title>Install the Paraform extraction button</title>
<body style="font:16px system-ui;max-width:640px;margin:40px auto;padding:0 16px;line-height:1.5">
<h1>Paraform extraction button</h1>
<p>1. Show the bookmarks bar in Chrome: <b>Cmd+Shift+B</b> (Mac) or <b>Ctrl+Shift+B</b> (Windows).<br>
2. Drag this black button up to the bookmarks bar:</p>
<p><a id="btn" draggable="true" style="display:inline-block;padding:10px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none;cursor:grab">Extract Paraform</a></p>
<script>
// PASTE the code of section 4 between the backticks. It must not contain backticks itself (it doesn't).
var CODE = String.raw`PASTE_THE_CODE_HERE`;
document.getElementById('btn').href = 'javascript:' + encodeURIComponent(CODE);
document.getElementById('btn').onclick = function (e) { e.preventDefault(); alert('Drag it to the bookmarks bar, then click it from the Paraform page.'); };
</script>
</body>
```

(When writing this file for the user, replace `PASTE_THE_CODE_HERE` with the code from section 4, keeping the two backticks around it.)

Steps for the user:

1. Open `install-button.html` in Chrome (double click).
2. Show the bookmarks bar (**Cmd+Shift+B** / **Ctrl+Shift+B**).
3. **Drag** the black "Extract Paraform" button onto the bookmarks bar. Done. They can close the file.

If dragging does not work, alternative: in Chrome, bookmarks manager, add a bookmark, name it "Extract Paraform", and in the URL field paste the value of `'javascript:' + encodeURIComponent(CODE)` (you can print it in the page with an extra line, then copy). Note: if the user types a `javascript:` address directly into the address bar, Chrome removes the `javascript:` prefix when pasting; use the bookmark editor instead.

**To change the code later:** edit it, rebuild the install page, and drag the button again (it replaces nothing automatically; delete the old bookmark).

## 6. Using it

1. Log in to Paraform and run the search as usual. Set the results to **table view**.
2. Click the **Extract Paraform** bookmark.
3. A box asks *how many candidates* to extract (default 10; leave empty for all). It stops paging once it has that many, so it is fast for small numbers.
4. It shows a preview of what it found and asks to confirm. Accept, and a CSV is downloaded to the Downloads folder.
5. Do not touch the Paraform tab while it runs (it clicks Next page by itself; a small black progress box appears at the bottom right).

Troubleshooting:

| Symptom | Likely cause / fix |
|---|---|
| Nothing happens when clicking | Not on the Paraform tab, or the bookmark lost its code. Re-drag it. If the site's security policy blocks it, say so, we can use the browser console instead. |
| "No candidates with a LinkedIn link found" | Not in table view, or Paraform changed. See section 3. |
| Fewer candidates than expected | Rows without a LinkedIn link are skipped on purpose (the preview tells how many). |
| Download blocked | Chrome shows a "download blocked" icon in the address bar: allow it for this site. |

---

## 7. OPTIONAL upgrades. Ask first, do not build automatically

> **AI: stop here and ask the user.** Say something like: *"Victor, who built this, also has these extras in his own system. Do you want any of them? I'd adapt them to how you work."* Then list the options below in one or two lines each and let the user choose. Do only what they accept. Adapt to the user's tools instead of copying blindly (ask whether they use a spreadsheet, Notion, a web app, or just files).

### Option A. A button that opens the LinkedIn profile and copies the message, formatted correctly

Idea: for each candidate in the CSV, one screen shows the candidate and the message already personalised. One button **"Open LinkedIn & copy"** opens the candidate's profile in a new tab and puts the message on the clipboard. **The human** then clicks *Connect*, *Add a note*, pastes (Cmd+V / Ctrl+V) and clicks *Send*. After that they press *Mark as sent* (or *Skip* / *Reject*) and the next candidate appears.

Two details that took trial and error and are worth reusing:

1. **Line breaks.** LinkedIn's rich-text message editors collapse a plain-text blank line into a single line break. The fix is to copy the message twice at once: as plain text AND as HTML where each paragraph is a `<p>` and blank lines are empty paragraphs. Plain text fields (the connection note box) use the text; rich editors use the HTML, and the blank lines survive:

```javascript
async function copyMessage(text) {
  const esc = (x) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const html = text.replace(/\r\n/g, '\n').split(/\n{2,}/)
    .map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>')
    .join('<p><br></p>');
  try {
    await navigator.clipboard.write([new ClipboardItem({
      'text/plain': new Blob([text], { type: 'text/plain' }),
      'text/html': new Blob([html], { type: 'text/html' }),
    })]);
    return true;
  } catch (e) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e2) { return false; }
  }
}
// Call it inside the click handler, right before window.open(url, 'li_tab'):
// the browser only allows clipboard writes during a user click.
```

2. **Personalisation.** A message template with `{{first_name}}` and `{{company}}`. First name = first word of the full name (drop titles like Dr./Mr., keep proper case); company = company name without suffixes like Inc, LLC, Ltd:

```javascript
const cap = (s) => (/^[a-zà-ÿ'-]+$|^[A-ZÀ-Ý'-]+$/.test(s) && s.length > 1 ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);
const firstName = (full) => cap(((full || '').trim().replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, '').split(/\s+/)[0] || '').replace(/[,;.]+$/, ''));
const cleanCompany = (c) => (c || '').trim().replace(/[,\s]+(inc|llc|ltd|corp|corporation|gmbh|co)\.?$/i, '').trim();
const fill = (tpl, p) => tpl
  .replace(/\{\{\s*first_name\s*\}\}/g, () => firstName(p.name))
  .replace(/\{\{\s*company\s*\}\}/g, () => cleanCompany(p.company));
```

Also normalise LinkedIn URLs to one form (`https://www.linkedin.com/in/<handle in lowercase>`, no `?query` and no trailing slash) so the same person is never queued twice.

### Option B. A setup panel: default messages, limits and counters

- **Default messages**, editable: message 1 (first contact) and message 2 (reply once the person answers), with the `{{first_name}}` and `{{company}}` placeholders.
- **Connection note limit**: LinkedIn caps a connection note at **300 characters**. Show a counter on each message and highlight it in red when over the limit.
- **Soft daily warning** (Victor uses about 20 sends per day) and a **weekly cap per calendar week, Monday to Sunday** (Victor uses 200, because LinkedIn counts by calendar week). Show a warning when approaching them. These are guard rails for the human, nothing is automated.
- **Counters**: pending, sent today, sent this week (with the cap), and sent per day of the week (Mon to Sun). Statuses for each candidate: pending, sent, accepted, replied, interested, not interested, skipped (not now, review later) and rejected (decided not to contact).
- Ask the user what limits *they* want; the numbers above are Victor's, not rules.

### Option C. Shared storage so two people work on the same list

Victor stores searches (job title and city) and candidates in a shared database (Supabase) so he and his partner see the same queue and nobody messages the same person twice. Only offer this if the user already has, or wants, a shared place (a database, a shared sheet, etc.). A shared Google Sheet with one row per candidate and a status column is a perfectly good lighter version.

---

*Summary for the AI:* do parts 1 to 6 (the bookmarklet that exports the CSV with LinkedIn URLs) step by step and verify the user got a CSV with a linkedin_url column; then ask about Option A, B and C separately; never automate LinkedIn.
