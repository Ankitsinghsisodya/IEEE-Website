"use server";
import { prisma } from "@/lib";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { updateThisUserRating } from "./updateThisUserRating";

// Update schema to include all required fields
const userSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  leetcodeHandle: z.string().optional(),
  codeforcesHandle: z.string().optional(),
  codechefHandle: z.string().optional(),
});

export const createUser = async (formdata: FormData) => {
  try {
    const name = formdata.get("name") as string;
    const email = formdata.get("email") as string;
    const leetcodeHandle = formdata.get("leetcodeHandle") as string;
    const codeforcesHandle = formdata.get("codeforcesHandle") as string;
    const codechefHandle = formdata.get("codechefHandle") as string;

    const user = {
      name,
      email,
      leetcodeHandle,
      codeforcesHandle,
      codechefHandle,
    };
    
    console.log(user);
    const parsedUser = userSchema.safeParse(user);
    if (!parsedUser.success) {
      const errors = parsedUser.error.flatten();
      throw new Error(errors.formErrors[0]);
    }

    const {
      name: userName,
      email: userEmail,
      leetcodeHandle: lcHandle,
      codeforcesHandle: cfHandle,
      codechefHandle: ccHandle,
    } = parsedUser.data;

    const userExists = await prisma.user.findFirst({
      where: {
        OR: [
          { name: userName },
          { email: userEmail },
          { leetcodeHandle: lcHandle },
          { codeforcesHandle: cfHandle },
          { codechefHandle: ccHandle },
        ],
      },
    });

    if (userExists) {
      const newUser = await prisma.user.update({
        where: { id: userExists.id },
        data: {
          name: userName,
          email: userEmail,
          leetcodeHandle: lcHandle || userExists.leetcodeHandle || "",
          codeforcesHandle: cfHandle || userExists.codeforcesHandle || "",
          codechefHandle: ccHandle || userExists.codechefHandle || "",
          leetcodeRating: 0,
          leetcodeProblemsSolved: 0,
          codeforcesRating: 0,
          codeforcesProblemsSolved: 0,
          codechefRating: 0,
          codechefProblemsSolved: 0,
          totalScore: 0,
        },
      });
    } else {
      const newUser = await prisma.user.create({
        data: {
          name: userName,
          email: userEmail,
          leetcodeHandle: lcHandle || "",
          codeforcesHandle: cfHandle || "",
          codechefHandle: ccHandle || "",
          leetcodeRating: 0,
          leetcodeProblemsSolved: 0,
          codeforcesRating: 0,
          codeforcesProblemsSolved: 0,
          codechefRating: 0,
          codechefProblemsSolved: 0,
          totalScore: 0,
        },
      });
    }
    // await updateUsersRating();
    const updatedUser = await prisma.user.findFirst({
      where: {
        email: formdata.get("email") as string,
      },
    });
    if (!updatedUser) {
      console.error("User not found");
      return;
    }
    await updateThisUserRating({ userId: updatedUser.id });

    revalidatePath("/leaderboard");
  } catch (error) {
    console.error("Error creating user:", error);
  }
};
