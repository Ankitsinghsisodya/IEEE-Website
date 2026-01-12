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

            // Process rating
            if (
              ratingRes.status === "fulfilled" &&
              ratingRes.value?.data?.userContestRanking?.rating
            ) {
              updates.leetcodeRating = Math.round(
                ratingRes.value.data.userContestRanking.rating
              );
            }

            // Process solved problems
            if (
              solvedRes.status === "fulfilled" &&
              solvedRes.value?.data?.solvedProblem
            ) {
              updates.leetcodeProblemsSolved =
                solvedRes.value.data.solvedProblem;
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
          updates.leetcodeProblemsSolved * 2;

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
