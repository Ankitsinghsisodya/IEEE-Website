"use server";
import { prisma } from "@/lib";
import { revalidatePath } from "next/cache";
import {
  API_ENDPOINTS,
  createDefaultUpdates,
  fetchWithRetry,
  isValidHandle,
  sleep,
} from "./utils/api-utils";

export const updateAllUsersRating = async () => {
  try {
    const users = await prisma.user.findMany();
    console.log(`Starting rating update for ${users.length} users...`);

    // Process users sequentially with small delay to avoid rate limiting
    for (const user of users) {
      try {
        const updates = createDefaultUpdates();

        // Codeforces update
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

            // Process status (problems solved)
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

            // Process rating
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
            console.error(`Codeforces API failed for ${user.name}:`, error);
          }
        }

        // LeetCode update
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

            // Process rating - check multiple possible locations
            if (ratingRes.status === "fulfilled" && ratingRes.value?.data) {
              const data = ratingRes.value.data;
              // Try direct userContestRanking first
              if (data.userContestRanking?.rating) {
                updates.leetcodeRating = Math.round(
                  data.userContestRanking.rating
                );
              }
              // Fallback: get latest from history if available
              else if (data.userContestRankingHistory?.length > 0) {
                const lastContest =
                  data.userContestRankingHistory[
                    data.userContestRankingHistory.length - 1
                  ];
                if (lastContest?.rating) {
                  updates.leetcodeRating = Math.round(lastContest.rating);
                }
              } else {
                console.warn(
                  `[DEBUG] LeetCode rating not found for ${user.name} (${user.leetcodeHandle}). ` +
                    `Response keys: ${Object.keys(data).join(", ")}. ` +
                    `userContestRanking: ${JSON.stringify(
                      data.userContestRanking
                    )}`
                );
              }
            } else {
              console.warn(
                `[DEBUG] LeetCode rating API failed for ${user.name} (${user.leetcodeHandle}). ` +
                  `Status: ${ratingRes.status}. ` +
                  `${
                    ratingRes.status === "rejected"
                      ? `Reason: ${ratingRes.reason}`
                      : ""
                  }`
              );
            }

            // Process solved problems
            if (
              solvedRes.status === "fulfilled" &&
              solvedRes.value?.data?.solvedProblem
            ) {
              updates.leetcodeProblemsSolved =
                solvedRes.value.data.solvedProblem;
            } else {
              console.warn(
                `[DEBUG] LeetCode solved API failed for ${user.name} (${user.leetcodeHandle}). ` +
                  `Status: ${solvedRes.status}. ` +
                  `${
                    solvedRes.status === "fulfilled"
                      ? `Data: ${JSON.stringify(solvedRes.value?.data)}`
                      : ""
                  }`
              );
            }
            // Fallback to alternative endpoint if both primary calls failed
            if (
              (ratingRes.status === "rejected" || !updates.leetcodeRating) &&
              (solvedRes.status === "rejected" ||
                !updates.leetcodeProblemsSolved)
            ) {
              try {
                const fallbackData = await fetchWithRetry(
                  API_ENDPOINTS.leetcode.fallback(user.leetcodeHandle!),
                  2
                );

                if (fallbackData?.data) {
                  if (!updates.leetcodeRating && fallbackData.data.ranking) {
                    updates.leetcodeRating = fallbackData.data.ranking;
                  }
                  if (
                    !updates.leetcodeProblemsSolved &&
                    fallbackData.data.totalSolved
                  ) {
                    updates.leetcodeProblemsSolved =
                      fallbackData.data.totalSolved;
                  }
                }
              } catch (fallbackError) {
                console.error(
                  `LeetCode fallback API also failed for ${user.name}:`,
                  fallbackError
                );
              }
            }
          } catch (error) {
            console.error(`LeetCode API failed for ${user.name}:`, error);
          }
        }

        // CodeChef update
        if (isValidHandle(user.codechefHandle)) {
          try {
            const ccResponse = await fetchWithRetry(
              API_ENDPOINTS.codechef.handle(user.codechefHandle!),
              3
            );

            if (ccResponse?.data?.currentRating) {
              updates.codechefRating = ccResponse.data.currentRating;
            } else {
              console.warn(
                `[DEBUG] CodeChef rating not found for ${user.name} (${user.codechefHandle}). ` +
                  `Response: ${JSON.stringify(ccResponse?.data)}`
              );
            }
          } catch (error) {
            console.error(`CodeChef API failed for ${user.name}:`, error);
          }
        }

        // Calculate total score
        updates.totalScore =
          updates.codeforcesRating +
          updates.leetcodeRating +
          updates.codechefRating +
          updates.codeforcesProblemsSolved * 2 +
          updates.leetcodeProblemsSolved * 2 +
          (updates.codechefProblemsSolved || 0) * 2;

        // Update user in database
        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });

        console.log(`Updated ${user.name}'s ratings:`, updates);

        // Small delay between users to avoid rate limiting
        await sleep(500);
      } catch (error) {
        console.error(`Error updating user ${user.name}:`, error);
      }
    }

    console.log("Rating update completed for all users.");
    revalidatePath("/leaderboard");
    return true;
  } catch (error) {
    console.error("Failed to update ratings:", error);
    return false;
  }
};
