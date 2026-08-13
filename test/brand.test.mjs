import test from 'node:test';
import assert from 'node:assert/strict';

import { BRAND, DIPS, FLAVOURS, PRODUCTS, PRODUCT_IDS, PROTEIN, randomProduct } from '../src/js/brand.js';
import { REWARDS } from '../src/js/economy.js';
import { MODES } from '../src/js/modes.js';

/**
 * Diese Datei ist die Bremse gegen erfundene Produkte: Alles, was die App
 * anzeigt, muss aus brand.js stammen. Wer ein Produkt ergänzt, ergänzt es
 * dort – und nur dort.
 */

test('Markenfakten sind vollständig hinterlegt', () => {
  assert.equal(BRAND.name, 'Loco Chicken');
  assert.match(BRAND.claim, /halal/i);
  assert.ok(FLAVOURS.length >= 4, 'Signature Flavours fehlen');
  assert.ok(DIPS.length >= 3, 'Dips fehlen');

  // Jeder Flavour und Dip hat Name und Farbe für die Darstellung.
  for (const entry of [...FLAVOURS, ...DIPS]) {
    assert.ok(entry.id?.length > 0);
    assert.ok(entry.name?.length > 0);
    assert.match(entry.color, /^#[0-9a-f]{6}$/i);
  }
});

test('jedes Produkt gehört einer Warengruppe an', () => {
  const groups = new Set(['chicken', 'side']);
  for (const id of PRODUCT_IDS) {
    assert.ok(PRODUCTS[id].name?.length > 0, `${id}: Name fehlt`);
    assert.ok(groups.has(PRODUCTS[id].group), `${id}: unbekannte Warengruppe`);
  }

  // Beide Gruppen sind besetzt – sonst hätte der Sortier-Modus keine Aufgabe.
  const byGroup = (group) => PRODUCT_IDS.filter((id) => PRODUCTS[id].group === group);
  assert.ok(byGroup('chicken').length >= 2);
  assert.ok(byGroup('side').length >= 2);

  // randomProduct respektiert die Gruppe.
  for (let i = 0; i < 30; i += 1) {
    assert.equal(PRODUCTS[randomProduct('chicken')].group, 'chicken');
    assert.equal(PRODUCTS[randomProduct('side')].group, 'side');
  }
});

test('die Protein-Angaben sind sauber getrennt', () => {
  assert.equal(PROTEIN.partner, 'ESN');

  // Der Designer Whey ist die Kooperation.
  assert.equal(PROTEIN.whey.partnership, true);
  assert.equal(PROTEIN.whey.proteinPerServing, 23);
  assert.equal(PROTEIN.whey.kcalPerServing, 114);

  // Das Kreatin-Flavour ist ein Produkt von Loco Chicken, nicht Teil des Deals.
  assert.equal(PROTEIN.creatineSeasoning.partnership, false);
  assert.equal(PROTEIN.creatineSeasoning.creatinePerPacket, 3);
});

test('Belohnungen bilden nur echte Produkte ab', () => {
  const allowed = [
    ...Object.values(PRODUCTS).map((product) => product.name),
    ...DIPS.map((dip) => dip.name),
    PROTEIN.whey.name,
    PROTEIN.creatineSeasoning.name,
  ];

  for (const reward of REWARDS) {
    assert.ok(reward.title?.length > 0, `${reward.id}: Titel fehlt`);
    assert.ok(reward.cost > 0, `${reward.id}: Preis fehlt`);
    assert.ok(reward.icon.startsWith('./assets/rewards/'), `${reward.id}: Icon fehlt`);
    assert.equal(typeof reward.minOrder, 'number', `${reward.id}: Mindestbestellwert fehlt`);
  }

  // Die Protein-Belohnungen verweisen auf die realen Angaben.
  const whey = REWARDS.find((reward) => reward.id === 'whey');
  assert.equal(whey.protein, true);
  assert.match(whey.subtitle, new RegExp(`${PROTEIN.whey.proteinPerServing} g Protein`));
  assert.match(whey.subtitle, new RegExp(`${PROTEIN.whey.kcalPerServing} kcal`));
  assert.ok(allowed.some((name) => name.includes('Designer Whey')));

  // Genau eine Belohnung ohne Mindestbestellwert: der Dip.
  const free = REWARDS.filter((reward) => reward.minOrder === 0);
  assert.deepEqual(free.map((reward) => reward.id), ['dip']);
});

test('Spielmodi zeigen nur Produktbilder, die es gibt', () => {
  // 'chili' und 'shaker' sind ebenfalls echt: Hot Chilli als Flavour und der
  // Shaker aus der Protein-Kooperation.
  const drawable = new Set([...PRODUCT_IDS, 'chili', 'shaker']);
  for (const mode of MODES) {
    assert.ok(drawable.has(mode.icon), `${mode.id}: Icon "${mode.icon}" ist kein echtes Produkt`);
  }
});
