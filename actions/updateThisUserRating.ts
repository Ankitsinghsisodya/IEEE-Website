"use server";
import { prisma } from "@/lib";
import { revalidatePath } from "next/cache";
import {
  API_ENDPOINTS,
  createDefaultUpdates,
  fetchWithRetry,
  isValidHandle,
} from "./utils/api-utils";

export const updateThisUserRating = async ({
  userId: userIdentification,
}: {
  userId: string;
}) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: userIdentification,
      },
    });

    if (!user) {
      console.error("User not found");
      return false;
    }

    try {
      const updates = createDefaultUpdates();

      // Codeforces update with retry logic
      if (isValidHandle(user.codeforcesHandle)) {
        try {
          const [statusRes, ratingRes] = await Promise.allSettled([
            fetchWithRetry(
              API_ENDPOINTS.codeforces.userStatus(user.codeforcesHandle!),
              3
            ),
            fetchWithRetry(
              API_ENDPOINTS.codeforces.userRating(user.codeforcesHandle!),
              3
            ),
          ]);

          if (
            statusRes.status === "fulfilled" &&
            statusRes.value?.data?.result
          ) {
            const solvedProblemSet = new Set<string>();
            statusRes.value.data.result.forEach((submission: any) => {
              if (submission.verdict === "OK") {
                solvedProblemSet.add(
                  `${submission.problem.contestId}-${submission.problem.index}`
                );
              }
            });
            updates.codeforcesProblemsSolved = solvedProblemSet.size;
          }

          if (
            ratingRes.status === "fulfilled" &&
            ratingRes.value?.data?.status === "OK" &&
            ratingRes.value.data.result.length > 0
          ) {
            updates.codeforcesRating =
              ratingRes.value.data.result[
                ratingRes.value.data.result.length - 1
              ].newRating;
          }
        } catch (error) {
          console.error(
            `Error fetching Codeforces data for ${user.name}:`,
            error
          );
        }
      }

      // LeetCode update with retry logic and fallback
      if (isValidHandle(user.leetcodeHandle)) {
        try {
          const [ratingRes, solvedRes] = await Promise.allSettled([
            fetchWithRetry(
              API_ENDPOINTS.leetcode.contestRanking(user.leetcodeHandle!),
              2
            ),
            fetchWithRetry(
              API_ENDPOINTS.leetcode.solved(user.leetcodeHandle!),
              2
            ),
          ]);

          // Process rating data if available
          if (
            ratingRes.status === "fulfilled" &&
            ratingRes.value?.data?.userContestRanking?.rating
          ) {
            updates.leetcodeRating = Math.round(
              ratingRes.value.data.userContestRanking.rating
            );
          }

          // Process solved problems data if available
          if (
            solvedRes.status === "fulfilled" &&
            solvedRes.value?.data?.solvedProblem
          ) {
            updates.leetcodeProblemsSolved = solvedRes.value.data.solvedProblem;
          }

          // Fallback to alternative endpoint if primary failed
          if (
            ratingRes.status === "rejected" ||
            solvedRes.status === "rejected"
          ) {
            try {
              const fallbackData = await fetchWithRetry(
                API_ENDPOINTS.leetcode.fallback(user.leetcodeHandle!),
                2
              );

              if (fallbackData?.data) {
                if (
                  ratingRes.status === "rejected" &&
                  fallbackData.data.ranking
                ) {
                  updates.leetcodeRating = fallbackData.data.ranking;
                }
                if (
                  solvedRes.status === "rejected" &&
                  fallbackData.data.totalSolved
                ) {
                  updates.leetcodeProblemsSolved =
                    fallbackData.data.totalSolved;
                }
              }
            } catch (fallbackError) {
              console.error(
                `Fallback LeetCode API also failed for ${user.name}:`,
                fallbackError
              );
            }
          }
        } catch (error) {
          console.error(
            `Error fetching LeetCode data for ${user.name}:`,
            error
          );
        }
      }

      // CodeChef update with retry logic
      if (isValidHandle(user.codechefHandle)) {
        try {
          const ccResponse = await fetchWithRetry(
            API_ENDPOINTS.codechef.handle(user.codechefHandle!),
            3
          );

          if (ccResponse?.data) {
            updates.codechefRating = ccResponse.data.currentRating || 0;
            updates.codechefProblemsSolved =
              ccResponse.data.problemsSolved || 0;
          }
        } catch (error) {
          console.error(
            `Error fetching CodeChef data for ${user.name}:`,
            error
          );
        }
      }

      // Calculate total score - only include CodeChef if handle was provided
      updates.totalScore =
        updates.codeforcesRating +
        updates.leetcodeRating +
        (isValidHandle(user.codechefHandle) ? updates.codechefRating : 0) +
        updates.codeforcesProblemsSolved * 2 +
        updates.leetcodeProblemsSolved * 2;

      // Update user in database
      await prisma.user.update({
        where: { id: user.id },
        data: updates,
      });

      console.log(`Updated ${user.name}'s ratings:`, updates);
    } catch (error) {
      console.error(`Error updating user ${user.name}:`, error);
    }

    revalidatePath("/leaderboard");
    return true;
  } catch (error) {
    console.error("Failed to update ratings:", error);
    return false;
  }
};
