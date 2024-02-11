import { categoryDictionary } from './categoryKeywords.js';

export const determineCategory = (title = '', description = '', keywords = '') => {
  const combinedText = `${title} ${description} ${keywords}`.toLowerCase();

  const categories = Object.entries(categoryDictionary);

  for (const [category, categoryKeywords] of categories) {
    const atLeastOneKeywordMatched = categoryKeywords.some(keyword => combinedText.includes(keyword));

    if (atLeastOneKeywordMatched) {
      return category;
    }
  }

  return 'Others';
};
