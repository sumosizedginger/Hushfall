import { recipes as base } from './recipes.js';
import { recipes3d } from './recipes3d.js';
import { recipesG2 } from './recipes_g2.js';
import { recipesE2 } from './recipes_e2.js';
export const recipes = { ...base, ...recipes3d, ...recipesG2, ...recipesE2 };
