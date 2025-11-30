/**
 * Keyboard Layout Mapping for Russian/English
 * Helps convert between different keyboard layouts
 */

// Russian to English keyboard layout mapping
const RU_TO_EN_LAYOUT: Record<string, string> = {
  'й': 'q', 'ц': 'w', 'у': 'e', 'к': 'r', 'е': 't', 'н': 'y', 'г': 'u', 'ш': 'i', 'щ': 'o', 'з': 'p',
  'х': '[', 'ъ': ']', 'ф': 'a', 'ы': 's', 'в': 'd', 'а': 'f', 'п': 'g', 'р': 'h', 'о': 'j', 'л': 'k',
  'д': 'l', 'ж': ';', 'э': '\'', 'я': 'z', 'ч': 'x', 'с': 'c', 'м': 'v', 'и': 'b', 'т': 'n', 'ь': 'm',
  'б': ',', 'ю': '.', 'ё': '`',
  'Й': 'Q', 'Ц': 'W', 'У': 'E', 'К': 'R', 'Е': 'T', 'Н': 'Y', 'Г': 'U', 'Ш': 'I', 'Щ': 'O', 'З': 'P',
  'Х': '{', 'Ъ': '}', 'Ф': 'A', 'Ы': 'S', 'В': 'D', 'А': 'F', 'П': 'G', 'Р': 'H', 'О': 'J', 'Л': 'K',
  'Д': 'L', 'Ж': ':', 'Э': '"', 'Я': 'Z', 'Ч': 'X', 'С': 'C', 'М': 'V', 'И': 'B', 'Т': 'N', 'Ь': 'M',
  'Б': '<', 'Ю': '>', 'Ё': '~'
};

// English to Russian keyboard layout mapping
const EN_TO_RU_LAYOUT: Record<string, string> = {
  'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з',
  '[': 'х', ']': 'ъ', 'a': 'ф', 's': 'ы', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л',
  'l': 'д', ';': 'ж', '\'': 'э', 'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь',
  ',': 'б', '.': 'ю', '`': 'ё',
  'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З',
  '{': 'Х', '}': 'Ъ', 'A': 'Ф', 'S': 'Ы', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л',
  'L': 'Д', ':': 'Ж', '"': 'Э', 'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь',
  '<': 'Б', '>': 'Ю', '~': 'Ё'
};

// English to Ukrainian keyboard layout mapping
const EN_TO_UA_LAYOUT: Record<string, string> = {
  'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш', 'o': 'щ', 'p': 'з',
  '[': 'х', ']': 'ї', 'a': 'ф', 's': 'і', 'd': 'в', 'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л',
  'l': 'д', ';': 'ж', '\'': 'є', 'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т', 'm': 'ь',
  ',': 'б', '.': 'ю', '`': 'ґ',
  'Q': 'Й', 'W': 'Ц', 'E': 'У', 'R': 'К', 'T': 'Е', 'Y': 'Н', 'U': 'Г', 'I': 'Ш', 'O': 'Щ', 'P': 'З',
  '{': 'Х', '}': 'Ї', 'A': 'Ф', 'S': 'І', 'D': 'В', 'F': 'А', 'G': 'П', 'H': 'Р', 'J': 'О', 'K': 'Л',
  'L': 'Д', ':': 'Ж', '"': 'Є', 'Z': 'Я', 'X': 'Ч', 'C': 'С', 'V': 'М', 'B': 'И', 'N': 'Т', 'M': 'Ь',
  '<': 'Б', '>': 'Ю', '~': 'Ґ'
};

// Common Russian to Ukrainian word mappings for furniture
const RU_TO_UA_WORDS: Record<string, string> = {
  'диван': 'диван',
  'стол': 'стіл',
  'стул': 'стілець',
  'кровать': 'ліжко',
  'шкаф': 'шафа',
  'комод': 'комод',
  'тумба': 'тумба',
  'полка': 'полиця',
  'кресло': 'крісло',
  'матрас': 'матрац',
  'диваны': 'дивани',
  'столы': 'столи',
  'стулья': 'стільці',
  'кровати': 'ліжка',
  'шкафы': 'шафи',
  'комоды': 'комоди',
  'тумбы': 'тумби',
  'полки': 'полиці',
  'кресла': 'крісла',
  'матрасы': 'матраци',
  'мебель': 'меблі',
  'новый': 'новий',
  'новая': 'нова',
  'новые': 'нові',
  'акция': 'акція',
  'скидка': 'знижка',
  'распродажа': 'розпродаж',
  'дерево': 'дерево',
  'металл': 'метал',
  'кожа': 'шкіра',
  'ткань': 'тканина',
  'белый': 'білий',
  'черный': 'чорний',
  'серый': 'сірий',
  'красный': 'червоний',
  'синий': 'синій',
  'зеленый': 'зелений',
  'современный': 'сучасний',
  'классический': 'класичний'
};

/**
 * Convert text from one keyboard layout to another
 */
export function convertLayout(text: string, fromLayout: 'en' | 'ru'): string {
  const layoutMap = fromLayout === 'en' ? EN_TO_RU_LAYOUT : RU_TO_EN_LAYOUT;
  return text.split('').map(char => layoutMap[char] || char).join('');
}

/**
 * Convert text to Ukrainian keyboard layout
 */
export function convertToUkrainian(text: string): string {
  return text.split('').map(char => EN_TO_UA_LAYOUT[char] || char).join('');
}

/**
 * Convert Russian words to Ukrainian equivalents
 */
export function convertRussianToUkrainian(text: string): string {
  const lowerText = text.toLowerCase();

  // Check if entire text matches a Russian word
  if (RU_TO_UA_WORDS[lowerText]) {
    return RU_TO_UA_WORDS[lowerText];
  }

  // Check each word separately
  const words = lowerText.split(/\s+/);
  const convertedWords = words.map(word => RU_TO_UA_WORDS[word] || word);

  return convertedWords.join(' ');
}

/**
 * Generate all possible keyboard layout variations of a search query
 */
export function generateLayoutVariations(query: string): string[] {
  const variations = new Set<string>();

  // Original query
  variations.add(query.toLowerCase());

  // English to Russian layout
  variations.add(convertLayout(query, 'en').toLowerCase());

  // English to Ukrainian layout
  variations.add(convertToUkrainian(query).toLowerCase());

  // Russian to English layout
  variations.add(convertLayout(query, 'ru').toLowerCase());

  // Russian to Ukrainian word conversion
  variations.add(convertRussianToUkrainian(query).toLowerCase());

  return Array.from(variations);
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if two strings are similar enough (typo tolerance)
 * Returns true if the strings are within the acceptable distance
 */
export function isSimilar(str1: string, str2: string, maxDistance: number = 2): boolean {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return distance <= maxDistance;
}

/**
 * Generate fuzzy search patterns for SQL ILIKE queries
 */
export function generateFuzzyPatterns(query: string): string[] {
  const patterns = new Set<string>();
  const variations = generateLayoutVariations(query);

  variations.forEach(variation => {
    // Exact match pattern
    patterns.add(variation);

    // Wildcard patterns for partial matches
    patterns.add(`${variation}%`);
    patterns.add(`%${variation}`);
    patterns.add(`%${variation}%`);

    // Handle single character typos by replacing each character with %
    if (variation.length > 3) {
      for (let i = 0; i < variation.length; i++) {
        const withWildcard = variation.substring(0, i) + '_' + variation.substring(i + 1);
        patterns.add(withWildcard);
        patterns.add(`%${withWildcard}%`);
      }
    }
  });

  return Array.from(patterns);
}
