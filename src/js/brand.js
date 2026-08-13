/**
 * Markenfakten – einzige Wahrheitsquelle für Produktnamen und Angaben.
 *
 * Regel für dieses Projekt: In der App tauchen nur Dinge auf, die es bei
 * Loco Chicken wirklich gibt. Alles hier Hinterlegte stammt aus öffentlich
 * einsehbaren Quellen (Bestellplattformen, Presse, Fachpresse); die Belege
 * stehen im README unter "Markenrecherche".
 *
 * Wer etwas ergänzt, ergänzt es hier – Spiele, Belohnungen und Missionen
 * lesen ausschließlich aus diesen Listen.
 */

/** Wie sich die Marke selbst positioniert. */
export const BRAND = {
  name: 'Loco Chicken',
  country: 'Deutschland',
  claim: '100 % halal · extra large',
  concept: 'Crispy Fried Chicken',
};

/**
 * Signature Flavours – der Spice Rub, mit dem Wings und Filets im
 * Shake Bucket geschüttelt werden.
 */
export const FLAVOURS = [
  { id: 'hot-chilli', name: 'Hot Chilli', color: '#d91f26' },
  { id: 'garlic-cheese', name: 'Garlic Cheese', color: '#f0c14b' },
  { id: 'truffle', name: 'White Truffle', color: '#6f6250' },
  { id: 'korean', name: 'Korean', color: '#c0392b' },
  { id: 'lemon-pepper', name: 'Lemon Pepper', color: '#9bbf2f' },
];

/**
 * Warengruppen für Spiele und Sortierlogik.
 * `group` unterscheidet Chicken von Beilagen – so wie im Laden gepackt wird.
 */
export const PRODUCTS = {
  wings: { name: 'Loco Wings', group: 'chicken' },
  filet: { name: 'Crunchy Filet', group: 'chicken' },
  burger: { name: 'Chili Cheese Burger', group: 'chicken' },
  fries: { name: 'Crispy Fries', group: 'side' },
  pops: { name: 'Potato Pops', group: 'side' },
  onion: { name: 'Onion Rings', group: 'side' },
  waffle: { name: 'BBQ Waffle', group: 'side' },
  dip: { name: 'Dip', group: 'side' },
};

export const PRODUCT_IDS = Object.keys(PRODUCTS);

/** Die Dips, die es wirklich gibt. */
export const DIPS = [
  { id: 'truffle-mayo', name: 'White Truffle Mayo', color: '#efe6d2' },
  { id: 'harissa-mayo', name: 'Harissa Mayo', color: '#e2703a' },
  { id: 'rosemary-ketchup', name: 'Rosemary Ketchup', color: '#b32222' },
  { id: 'hot-chili-sauce', name: "Loco's Hot Chili Sauce", color: '#d91f26' },
];

/**
 * High-Protein-Schiene.
 *
 * Wichtig für die Genauigkeit: Der Designer Whey in der Sorte Chicken Waffle
 * ist die Kooperation mit ESN. Das Lemon Pepper Flavour mit Kreatin ist ein
 * Produkt von Loco Chicken und laut Fachpresse ausdrücklich *nicht* Teil
 * dieser Kooperation – auch wenn beides zusammen beworben wurde.
 */
export const PROTEIN = {
  partner: 'ESN',
  whey: {
    name: 'ESN Designer Whey · Chicken Waffle',
    proteinPerServing: 23,
    kcalPerServing: 114,
    serving: '30 g Pulver auf 200 ml Wasser',
    partnership: true,
  },
  creatineSeasoning: {
    name: 'Lemon Pepper Flavour mit Kreatin',
    creatinePerPacket: 3,
    partnership: false,
  },
};

/** Zufälliger Flavour – für Spiele, die einen brauchen. */
export function randomFlavour(random = Math.random) {
  return FLAVOURS[Math.floor(random() * FLAVOURS.length)];
}

/** Zufälliges Produkt aus einer Warengruppe (oder allen). */
export function randomProduct(group = null, random = Math.random) {
  const pool = group ? PRODUCT_IDS.filter((id) => PRODUCTS[id].group === group) : PRODUCT_IDS;
  return pool[Math.floor(random() * pool.length)];
}
