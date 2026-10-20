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
    const card = node('a', 'site-card');
    card.href = `sites/${encodeURIComponent(site.slug)}/`;
    const top = node('div', 'card-top');
    const arrow = node('span', 'arrow', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    top.append(node('span', 'category', site.category || 'Website'), arrow);
    const bottom = node('div', 'card-bottom');
    const date = /^\d{4}-\d{2}-\d{2}$/.test(site.updated || '') ? new Date(`${site.updated}T12:00:00Z`) : null;
    const formatted = date && !Number.isNaN(date.valueOf()) ? new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'}).format(date) : '';
    bottom.append(node('span', '', site.language || ''), node('span', '', formatted));
    card.append(top, node('h3', '', site.title), node('p', '', site.description), bottom);
    list.append(card);
  }
  document.querySelector('#count').textContent = String(matching.length).padStart(2, '0');
  document.querySelector('#empty').hidden = matching.length > 0;
  document.querySelector('#status').textContent = `${matching.length} ${matching.length === 1 ? 'site' : 'sites'} found.`;
}
fetch('sites.json').then(response => {
  if (!response.ok) throw new Error('Catalog unavailable');
  return response.json();
}).then(data => {
  if (!Array.isArray(data)) throw new Error('Invalid catalog');
  entries = data.filter(site => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site.slug) && typeof site.title === 'string');
  render();
  search.addEventListener('input', render);
}).catch(() => {
  // The initial HTML keeps the first report accessible if the catalog cannot load.
  search.disabled = true;
  search.placeholder = 'Search unavailable';
});
