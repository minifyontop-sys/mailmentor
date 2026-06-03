import type { Condition, Recipe, RecipeTrigger } from "./schema";

/**
 * An email that a recipe is being evaluated against. We keep the surface
 * minimal — only the fields recipes can condition on.
 */
export interface RecipeEmail {
  id: string;
  subject: string;
  body: string;
  senderName: string;
  senderEmail: string;
  isReplyToMine: boolean;
  hasAttachment: boolean;
  labels: string[];
  isVip: boolean;
}

export interface RecipeMatch {
  recipe: Recipe;
  email: RecipeEmail;
}

function evaluateCondition(
  cond: Condition,
  email: RecipeEmail
): boolean {
  let fieldValue = "";
  switch (cond.field) {
    case "sender":
      fieldValue = email.senderName;
      break;
    case "senderEmail":
      fieldValue = email.senderEmail;
      break;
    case "subject":
      fieldValue = email.subject;
      break;
    case "body":
      fieldValue = email.body;
      break;
    case "label":
      fieldValue = email.labels.join(",");
      break;
    case "hasAttachment":
      return cond.op === "exists" ? email.hasAttachment : false;
    case "fromVip":
      return cond.op === "exists" ? email.isVip : false;
  }

  const target = (cond.value ?? "").toLowerCase();
  if (cond.op === "exists") return fieldValue.length > 0;
  if (cond.op === "equals") return fieldValue.toLowerCase() === target;
  if (cond.op === "contains") return fieldValue.toLowerCase().includes(target);
  if (cond.op === "matches") {
    try {
      return new RegExp(cond.value ?? "", "i").test(fieldValue);
    } catch {
      return false;
    }
  }
  return false;
}

export function emailMatchesRecipe(
  recipe: Recipe,
  email: RecipeEmail
): boolean {
  if (!recipe.enabled) return false;
  if (!triggerMatchesEmail(recipe.trigger)) return false;
  return recipe.conditions.every((c) => evaluateCondition(c, email));
}

function triggerMatchesEmail(trigger: RecipeTrigger): boolean {
  // Manual / schedule triggers don't fire on email events. Caller is
  // responsible for invoking the right evaluator.
  return trigger.type === "email.arrived" || trigger.type === "email.sent";
}

export function findMatchingRecipes(
  recipes: Recipe[],
  email: RecipeEmail
): RecipeMatch[] {
  return recipes
    .filter((r) => emailMatchesRecipe(r, email))
    .map((recipe) => ({ recipe, email }));
}
