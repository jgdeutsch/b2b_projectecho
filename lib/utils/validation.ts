/**
 * Validates LinkedIn post URL according to PhantomBuster requirements
 * Based on: https://help.phantombuster.com/en/articles/...
 */

export function validateLinkedInPostUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'LinkedIn post URL is required' };
  }

  // Check if it's a valid URL
  try {
    const urlObj = new URL(url);
    
    // Must be from linkedin.com domain
    if (!urlObj.hostname.includes('linkedin.com')) {
      return { valid: false, error: 'URL must be from linkedin.com domain' };
    }

    // Reject pulse posts (not supported)
    if (urlObj.pathname.includes('/pulse/')) {
      return {
        valid: false,
        error: 'Pulse posts (linkedin.com/pulse/...) are not supported. Please use regular LinkedIn posts.',
      };
    }

    // Must be a post URL (contains /posts/)
    if (!urlObj.pathname.includes('/posts/')) {
      return {
        valid: false,
        error: 'URL must be a LinkedIn post URL (containing /posts/)',
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Estimates execution time based on number of likers
 * Based on PhantomBuster: ~25 seconds per 900 likers
 */
export function estimateExecutionTime(numLikers: number): number {
  // ~25 seconds per 900 likers = ~0.028 seconds per liker
  // Add 30 seconds buffer for setup/teardown
  return Math.ceil((numLikers / 900) * 25) + 30;
}

/**
 * LinkedIn's visibility limit: max 3,000 likers per post
 */
export const LINKEDIN_MAX_LIKERS = 3000;

