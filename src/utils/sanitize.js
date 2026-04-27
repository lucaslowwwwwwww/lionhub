import DOMPurify from 'dompurify'

/**
 * sanitize.js — Centralized input sanitization utility.
 * Rule #9: Sanitize every input to prevent XSS.
 * 
 * Strips all HTML tags and dangerous content from user input
 * while preserving safe text characters.
 */

/**
 * Sanitize a single string value.
 * Strips all HTML/script content, returns plain text only.
 */
export function sanitizeText(value) {
  if (typeof value !== 'string') return value
  // ALLOW_TAGS: [] means strip ALL HTML tags, returning plain text only
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [] }).trim()
}

/**
 * Recursively sanitize all string values in an object.
 * Useful for sanitizing entire form data objects before database writes.
 */
export function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sanitizeObject)

  const sanitized = {}
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}
