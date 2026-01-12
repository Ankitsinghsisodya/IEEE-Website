"use server";
import { prisma } from "@/lib";

// Type for user returned from database
type User = Awaited<ReturnType<typeof prisma.user.findMany>>[number];

export const getUsers = async (): Promise<User[]> => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        totalScore: "desc",
      },
    });
    return users;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

// Keep old name as alias for backward compatibility
export const getUser = getUsers;
