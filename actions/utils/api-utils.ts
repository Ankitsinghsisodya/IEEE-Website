import axios, { AxiosResponse } from "axios";

// API endpoint constants
export const API_ENDPOINTS = {
  codeforces: {
    userStatus: (handle: string) =>
      `https://codeforces.com/api/user.status?handle=${handle}`,
    userRating: (handle: string) =>
      `https://codeforces.com/api/user.rating?handle=${handle}`,
  },
  leetcode: {
    contestRanking: (handle: string) =>
      `https://alfa-leetcode-api-x0kj.onrender.com/userContestRankingInfo/${handle}`,
    solved: (handle: string) =>
      `https://alfa-leetcode-api-x0kj.onrender.com/${handle}/solved`,
    fallback: (handle: string) =>
      `https://leetcode-stats-api.herokuapp.com/${handle}`,
  },
  codechef: {
    handle: (handle: string) =>
      `https://codechef-api.vercel.app/handle/${handle}`,
  },
} as const;

// Type for rating updates
export interface RatingUpdates {
  codeforcesRating: number;
  codeforcesProblemsSolved: number;
  leetcodeRating: number;
  leetcodeProblemsSolved: number;
  codechefRating: number;
  codechefProblemsSolved?: number;
  totalScore: number;
}

// Check if handle is valid (not empty or "none")
export function isValidHandle(handle: string | null | undefined): boolean {
  return !!handle && handle.toLowerCase() !== "none" && handle.trim() !== "";
}

// Fetch with retry logic and exponential backoff
export async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  delay: number = 1000,
  timeout: number = 5000
): Promise<AxiosResponse | null> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, { timeout });
      return response;
    } catch (error) {
      console.warn(
        `Attempt ${attempt + 1}/${maxRetries} failed for ${url}:`,
        error instanceof Error ? error.message : error
      );
      lastError = error;

      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, delay * (attempt + 1))
        );
      }
    }
  }

  console.error(`All ${maxRetries} attempts failed for ${url}:`, lastError);
  return null;
}

// Sleep utility for rate limiting
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Create default rating updates object
export function createDefaultUpdates(): RatingUpdates {
  return {
    codeforcesRating: 0,
    codeforcesProblemsSolved: 0,
    leetcodeRating: 0,
    leetcodeProblemsSolved: 0,
    codechefRating: 0,
    codechefProblemsSolved: 0,
    totalScore: 0,
  };
}
