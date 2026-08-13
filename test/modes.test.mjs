import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_MODE, MODES, findMode, resolveMode } from '../src/js/modes.js';

/** Muss zu den Schlüsseln von ENGINES in game.js passen. */
const KNOWN_ENGINES = ['belt', 'chili', 'dipmeter', 'fryer', 'order', 'register', 'sorting', 'stack'];

test('es gibt acht Spiele mit eindeutigen Kennungen', () => {
  assert.equal(MODES.length, 8);
  assert.equal(new Set(MODES.map((mode) => mode.id)).size, 8);
  assert.equal(new Set(MODES.map((mode) => mode.title)).size, 8);
});

test('jedes Spiel hat eine eigene Mechanik und vollständige Angaben', () => {
  // Acht Spiele, acht Engines – kein Modus ist die Variante eines anderen.
  assert.equal(new Set(MODES.map((mode) => mode.engine)).size, 8);

  for (const mode of MODES) {
    assert.ok(KNOWN_ENGINES.includes(mode.engine), `${mode.id}: unbekannte Engine ${mode.engine}`);
    assert.ok(mode.title?.length > 0, `${mode.id}: Titel fehlt`);
    assert.ok(mode.subtitle?.length > 10, `${mode.id}: Beschreibung fehlt`);
    assert.ok(mode.skill?.length > 0, `${mode.id}: Fähigkeit fehlt`);
    assert.ok(mode.icon?.length > 0, `${mode.id}: Icon fehlt`);
    assert.equal(typeof mode.config, 'object', `${mode.id}: Konfiguration fehlt`);
    assert.ok(mode.config.perfectPoints > 0, `${mode.id}: perfectPoints fehlt`);
  }
});

test('resolveMode fällt auf den Standard zurück', () => {
  assert.equal(resolveMode('fritteuse').id, 'fritteuse');
  assert.equal(resolveMode('gibt-es-nicht').id, DEFAULT_MODE);
  assert.equal(resolveMode(undefined).id, DEFAULT_MODE);
  assert.ok(findMode(DEFAULT_MODE));
});
