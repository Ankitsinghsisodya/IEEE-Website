"use server";

import { prisma } from "@/lib";
import { updateThisUserRating } from "./updateThisUserRating";

// Input validation helpers
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function normalizeHandle(handle: string | undefined): string {
  if (!handle || handle.trim() === "") return "none";
  return handle.trim();
}

// Return type
interface CreateUserResult {
  success: boolean;
  user?: Awaited<ReturnType<typeof prisma.user.findFirst>>;
  isUpdate?: boolean;
  error?: string;
}

export async function createUser(formData: {
  name: string;
  email: string;
  leetcodeHandle: string;
  codeforcesHandle: string;
  codechefHandle: string;
}): Promise<CreateUserResult> {
  try {
    // Validate required fields
    const name = formData.name?.trim();
    const email = formData.email?.trim().toLowerCase();

    if (!name) {
      return { success: false, error: "Name is required" };
    }

    if (!email || !validateEmail(email)) {
      return { success: false, error: "Valid email is required" };
    }

    // Normalize handles
    const userData = {
      name,
      email,
      leetcodeHandle: normalizeHandle(formData.leetcodeHandle),
      codeforcesHandle: normalizeHandle(formData.codeforcesHandle),
      codechefHandle: normalizeHandle(formData.codechefHandle),
      leetcodeRating: 0,
      leetcodeProblemsSolved: 0,
      codeforcesRating: 0,
      codeforcesProblemsSolved: 0,
      codechefRating: 0,
      codechefProblemsSolved: 0,
      totalScore: 0,
    };

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: userData.email,
      },
    });

    let user;

    if (existingUser) {
      // Update existing user
      user = await prisma.user.update({
        where: {
          id: existingUser.id,
        },
        data: {
          name: userData.name,
          leetcodeHandle: userData.leetcodeHandle,
          codeforcesHandle: userData.codeforcesHandle,
          codechefHandle: userData.codechefHandle,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: userData,
      });
    }

    // Fetch ratings for the user
    if (user) {
      await updateThisUserRating({ userId: user.id });
    }

    return { success: true, user, isUpdate: !!existingUser };
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return { success: false, error: "Failed to create/update user" };
  }
}
