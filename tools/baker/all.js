import { recipes as base } from './recipes.js';
import { recipes3d } from './recipes3d.js';
import { recipesG2 } from './recipes_g2.js';
import { recipesE2 } from './recipes_e2.js';
import { recipesE2b } from './recipes_e2b.js';
import { recipesChoir } from './recipes_choir.js';
import { recipesPT21 } from './recipes_pt21.js';
import { recipesE3 } from './recipes_e3.js';
import { recipesE3b } from './recipes_e3b.js';
import { recipesE4 } from './recipes_e4.js';
import { recipesE4b } from './recipes_e4b.js';
import { recipesPT36 } from './recipes_pt36.js';
import { recipesC2a } from './recipes_c2a.js';
export const recipes = { ...base, ...recipes3d, ...recipesG2, ...recipesE2, ...recipesE2b, ...recipesChoir, ...recipesPT21, ...recipesE3, ...recipesE3b, ...recipesE4, ...recipesE4b, ...recipesPT36, ...recipesC2a };      // PT-021: the material pass supersedes the earlier recipe of the same id
