import { CATEGORIES } from './naqi.js';

export function actionForCategory(category) {
  if (category === 'Poor') return 'limit_outdoor';
  if (category === 'Very Poor' || category === 'Severe') return 'cancel_outdoor';
  return 'normal';
}
export function ruleMatches(rule, category, now = new Date()) {
  return Boolean(rule?.active && new Date(rule.expiresAt) >= now && CATEGORIES.indexOf(category) >= CATEGORIES.indexOf(rule.minCategory));
}
