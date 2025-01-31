// lib/slugify.ts
import slugify from 'slugify';

export function generateSlug(name: string): string {
  return slugify(name, {
    lower: true,       // Convert to lowercase
    strict: true,      // Remove special characters
    replacement: '-',  // Replace spaces and special characters with a dash
    trim: true,        // Trim leading and trailing replacement characters
    locale: 'uk, eng'        // Specify Ukrainian locale for proper transliteration
  });
}
