import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Vec3 } from 'cannon-es';
import { createDeskPhysics, PAPER_THICKNESS } from '../src/desk-physics.js';
import { documentsFromSites, documentMatches } from '../src/documents.js';

function advance(desk, seconds) {
  for (let i = 0; i < seconds * 120; i++) desk.step(1 / 120);
}

test('a released document falls onto the table and stays face up', () => {
  const desk = createDeskPhysics(14, 11);
  const paper = desk.addPaper({ x: 0, z: 0, y: 1.4, angle: 0.5 });
  advance(desk, 3);
  assert(Math.abs(paper.position.y - PAPER_THICKNESS / 2) < 0.015);
  assert(paper.quaternion.vmult(new Vec3(0, 1, 0)).y > 0.99);
  assert(paper.velocity.length() < 0.1);
});

test('dragging lifts and moves a document; dropping it on another produces a physical stack', () => {
  const desk = createDeskPhysics(14, 11);
  const lower = desk.addPaper({ x: 2, z: 0 });
  const upper = desk.addPaper({ x: -3, z: 0 });
  advance(desk, 1);
  desk.beginDrag(upper, upper.position);
  desk.moveDrag({ x: 2, y: 1, z: 0 });
  advance(desk, 2);
  assert(Math.abs(upper.position.x - 2) < 0.1);
  assert(upper.position.y > 0.8);
  desk.release();
  advance(desk, 3);
  assert(upper.position.y - lower.position.y > PAPER_THICKNESS * 0.85, 'Documents must not pass through each other');
  assert(upper.position.y < 0.2);
  assert(Math.abs(upper.position.x - lower.position.x) < 0.3);
});

test('fast far-outside dragging stays bounded, and tidy aligns documents with the table', () => {
  const desk = createDeskPhysics(14, 11);
  const paper = desk.addPaper({ x: -2.2, z: -1.1, angle: 0.3, tidyX: -2, tidyZ: -1 });
  const second = desk.addPaper({ x: 2.1, z: -0.8, angle: -0.4, tidyX: 2, tidyZ: -1 });
  desk.beginDrag(paper, paper.position);
  desk.moveDrag({ x: 999, y: 999, z: -999 });
  advance(desk, 3);
  desk.release();
  advance(desk, 3);
  assert(Number.isFinite(paper.position.x));
  assert(Math.abs(paper.position.x) < 7);
  assert(Math.abs(paper.position.z) < 5.5);
  assert(paper.position.y >= 0);
  desk.reset();
  assert.equal(paper.position.x, -2);
  assert.equal(paper.position.z, -1);
  assert.equal(second.position.x, 2);
  assert.equal(second.position.z, -1);
  for (const body of [paper, second]) {
    assert.deepEqual(body.quaternion.toArray(), [0, 0, 0, 1]);
    assert.equal(body.velocity.length(), 0);
    assert.equal(body.angularVelocity.length(), 0);
  }
  assert.equal(desk.dragging, null);
  advance(desk, 2);
  for (const body of [paper, second]) {
    assert(Math.abs(body.quaternion.y) < 0.001, 'Documents stay aligned after settling');
  }
});

test('the desk and index contain only complete published artifacts', () => {
  const catalog = JSON.parse(readFileSync(new URL('../docs/sites.json', import.meta.url)));
  const documents = documentsFromSites(catalog.map(site => ({
    ...site, documents: [{ anchor: 'architecture', title: 'Architecture' }],
  })));
  assert.equal(documents.length, catalog.length);
  for (const document of documents) {
    assert.equal(document.kind, 'Full artifact');
    assert.equal(document.href, 'sites/' + document.slug + '/');
    assert(readFileSync(new URL('../docs/' + document.href + 'index.html', import.meta.url), 'utf8').length > 0);
    assert(documentMatches(document, document.title));
  }
});
