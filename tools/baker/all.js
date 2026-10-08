import { recipes as base } from './recipes.js';
import { recipes3d } from './recipes3d.js';
import { recipesG2 } from './recipes_g2.js';
import { recipesE2 } from './recipes_e2.js';
import { recipesE2b } from './recipes_e2b.js';
import { recipesChoir } from './recipes_choir.js';
import { recipesPT21 } from './recipes_pt21.js';
export const recipes = { ...base, ...recipes3d, ...recipesG2, ...recipesE2, ...recipesE2b, ...recipesChoir, ...recipesPT21 };      // PT-021: the material pass supersedes the earlier recipe of the same id
