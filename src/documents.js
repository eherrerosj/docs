export function documentsFromSites(sites) {
  if (!Array.isArray(sites)) throw new TypeError('The catalog must be an array.');
  const documents = [];
  const seen = new Set();
  for (const site of sites) {
    if (!site || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(site.slug) || typeof site.title !== 'string' || seen.has(site.slug)) continue;
    seen.add(site.slug);
    const base = {
      slug: site.slug, artifact: site.title, language: site.language || '',
      updated: site.updated || '', description: site.description || '',
      category: site.category || 'Artifact',
    };
    const href = 'sites/' + encodeURIComponent(site.slug) + '/';
    documents.push({ ...base, id: site.slug, title: site.title, href, kind: 'Full artifact' });
  }
  return documents;
}

export function documentMatches(document, query) {
  return [document.title, document.artifact, document.description, document.category, document.language]
    .join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
}
