import { CatAlley } from './catAlley';
import { CatStairs } from './catStairs';
import { DeerMeadow } from './deerMeadow';
import { FalconPhi } from './falconPhi';
import type { Recipe } from './recipe';
import { WhaleFall } from './whaleFall';

/** Recipes available in /bake. The first one is the default. */
export const RECIPES: Record<string, () => Recipe> = {
  'cat-stairs': () => new CatStairs(),
  'cat-alley': () => new CatAlley(),
  'deer-meadow': () => new DeerMeadow(),
  'whale-fall': () => new WhaleFall(),
  'falcon-phi': () => new FalconPhi(),
};

export function recipeFromUrl(): Recipe {
  const id = new URLSearchParams(location.search).get('scene') ?? Object.keys(RECIPES)[0];
  return (RECIPES[id] ?? Object.values(RECIPES)[0])();
}
