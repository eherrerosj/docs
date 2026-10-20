'use strict';
const list = document.querySelector('#sites');
const search = document.querySelector('#search');
let entries = [];
function node(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text) element.textContent = text;
  return element;
}
function render() {
  const query = search.value.trim().toLocaleLowerCase();
  const matching = entries.filter(site => [site.title, site.description, site.category, site.language].join(' ').toLocaleLowerCase().includes(query));
  list.replaceChildren();
  for (const site of matching) {
    const row = node('a', 'artifact');
    row.href = 'sites/' + encodeURIComponent(site.slug) + '/';
    row.dataset.index = String(entries.indexOf(site));
    const number = node('span', 'artifact-number', '[' + String(entries.indexOf(site) + 1).padStart(3, '0') + ']');
    number.setAttribute('aria-hidden', 'true');
    const body = node('div', 'artifact-body');
    body.append(node('h3', '', site.title), node('p', '', site.description));
    const meta = node('div', 'artifact-meta');
    const year = /^\d{4}-\d{2}-\d{2}$/.test(site.updated || '') ? site.updated.slice(0, 4) : '';
    meta.append(node('span', '', site.category || 'Website'), node('span', '', [site.language, year].filter(Boolean).join(' · ')));
    const arrow = node('span', 'artifact-open', '[↗]');
    arrow.setAttribute('aria-hidden', 'true');
    row.append(number, body, meta, arrow);
    list.append(row);
  }
  document.querySelector('#count').textContent = '[' + String(matching.length).padStart(2, '0') + ']';
  document.querySelector('#empty').hidden = matching.length > 0;
  document.querySelector('#status').textContent = matching.length + (matching.length === 1 ? ' artifact.' : ' artifacts.');
}
fetch('sites.json').then(response => {
  if (!response.ok) throw new Error('Catalog unavailable');
  return response.json();
}).then(data => {
  if (!Array.isArray(data)) throw new Error('Invalid catalog');
  entries = data.filter(site => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site.slug) && typeof site.title === 'string');
  list.dataset.total = String(entries.length);
  document.querySelector('#archive-count').textContent = '[' + entries.length + (entries.length === 1 ? ' file]' : ' files]');
  render();
  document.dispatchEvent(new CustomEvent('library:catalog', { detail: entries.length }));
  // Keep a small collection quiet; show search once it is useful.
  document.querySelector('#search-wrap').hidden = entries.length < 6;
  document.querySelector('.index-note').hidden = entries.length >= 6;
  search.addEventListener('input', render);
}).catch(() => {
  // The first artifact is also in the HTML, so it works without JavaScript.
  document.querySelector('#search-wrap').hidden = true;
});
