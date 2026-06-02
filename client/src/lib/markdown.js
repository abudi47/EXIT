// Minimal, safe Markdown -> HTML for the notes reader.
// (Ported from the original single-file app, unchanged behavior.)
export function renderMarkdown(md) {
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  let html = "";
  let i = 0;
  const inline = (t) => {
    t = esc(t);
    t = t.replace(/`([^`]+)`/g, "<code>$1</code>");
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    t = t.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>'
    );
    return t;
  };
  while (i < lines.length) {
    let line = lines[i];
    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, "").trim();
      let code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i]);
        i++;
      }
      i++;
      html += `<pre data-lang="${esc(lang)}"><code>${esc(
        code.join("\n")
      )}</code></pre>`;
      continue;
    }
    if (/^>\s?/.test(line)) {
      let quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html += `<blockquote>${renderMarkdown(quote.join("\n"))}</blockquote>`;
      continue;
    }
    if (
      /\|/.test(line) &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes("-")
    ) {
      const parseRow = (r) =>
        r
          .replace(/^\s*\|/, "")
          .replace(/\|\s*$/, "")
          .split("|")
          .map((c) => c.trim());
      const header = parseRow(line);
      i += 2;
      let rows = [];
      while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== "") {
        rows.push(parseRow(lines[i]));
        i++;
      }
      html +=
        "<table><thead><tr>" +
        header.map((h) => `<th>${inline(h)}</th>`).join("") +
        "</tr></thead><tbody>";
      html += rows
        .map(
          (r) => "<tr>" + r.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>"
        )
        .join("");
      html += "</tbody></table>";
      continue;
    }
    let m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) {
      const lvl = m[1].length;
      html += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
      i++;
      continue;
    }
    if (/^\s*---+\s*$/.test(line)) {
      html += "<hr/>";
      i++;
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      let items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      html += "<ul>" + items.map((it) => `<li>${inline(it)}</li>`).join("") + "</ul>";
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      let items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      html += "<ol>" + items.map((it) => `<li>${inline(it)}</li>`).join("") + "</ol>";
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    let para = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,6})\s|^```|^>\s?|^\s*[-*+]\s|^\s*\d+\.\s|^\s*---+\s*$/.test(lines[i]) &&
      !(
        /\|/.test(lines[i]) &&
        i + 1 < lines.length &&
        /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])
      )
    ) {
      para.push(lines[i]);
      i++;
    }
    html += `<p>${inline(para.join(" "))}</p>`;
  }
  return html;
}

// Light inline-code styling for question/option text.
export function codeify(t) {
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc(t).replace(/`([^`]+)`/g, "<code>$1</code>");
}

export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export const haptic = (ms = 8) => {
  try {
    if (navigator.vibrate) navigator.vibrate(ms);
  } catch (e) {}
};
