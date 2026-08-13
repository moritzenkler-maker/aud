/**
 * Fabrik für die Spielmodi.
 *
 * Ordnet die `engine`-Angabe aus modes.js der passenden Klasse zu. Die App
 * kennt dadurch nur diese eine Funktion und muss die einzelnen Spiele nicht
 * auseinanderhalten.
 */

import { resolveMode } from './modes.js';
import BeltGame from './games/belt.js';
import ChiliGame from './games/chili.js';
import DipMeterGame from './games/dipmeter.js';
import FryerGame from './games/fryer.js';
import OrderGame from './games/order.js';
import RegisterGame from './games/register.js';
import SortingGame from './games/sorting.js';
import StackGame from './games/stack.js';

const ENGINES = {
  belt: BeltGame,
  chili: ChiliGame,
  dipmeter: DipMeterGame,
  fryer: FryerGame,
  order: OrderGame,
  register: RegisterGame,
  sorting: SortingGame,
  stack: StackGame,
};

/** Alle in modes.js verwendbaren Engine-Namen. */
export const ENGINE_IDS = Object.keys(ENGINES);

/**
 * Erzeugt die Spielinstanz für einen Modus.
 * @param {string} modeId
 * @param {HTMLCanvasElement} canvas
 * @param {{onUpdate?: Function, onGameOver?: Function}} handlers
 */
export function createGame(modeId, canvas, handlers) {
  const mode = resolveMode(modeId);
  const Engine = ENGINES[mode.engine];
  if (!Engine) throw new Error(`Unbekannte Engine: ${mode.engine}`);
  return new Engine(canvas, handlers, { ...mode.config, id: mode.id, strikes: mode.config.strikes ?? 3 });
}
