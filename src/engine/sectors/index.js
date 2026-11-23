import hospitality from './hospitality.js';
import realEstate from './realEstate.js';
import leisure from './leisure.js';
import retail from './retail.js';
import community from './community.js';
import urbanServices from './urbanServices.js';

export const SECTORS = [realEstate, hospitality, leisure, retail, community, urbanServices];

export function getSector(id) {
  const s = SECTORS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown sector "${id}". Valid: ${SECTORS.map((x) => x.id).join(', ')}`);
  return s;
}
