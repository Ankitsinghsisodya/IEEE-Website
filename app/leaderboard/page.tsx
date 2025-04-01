"use client";
import { Header1 } from "@/components/ui/header";
import { Footer } from "@/components/ui/footer";
import { Meteors } from "@/components/ui/meteor";
import { BackgroundSparkles } from "@/components/ui/animations/BackgroundSparkles";
import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import {
  Trophy,
  Medal,
  Code,
  Search,
  Filter,
  ArrowUpDown,
  Github,
  RefreshCw,
  User,
  Sparkles,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LeaderboardTable } from "@/components/ui/leaderboard/LeaderboardTable";
import { LeaderboardForm } from "@/components/ui/leaderboard/LeaderboardForm";
import { LeaderboardStats } from "@/components/ui/leaderboard/LeaderboardStats";
import { TopPerformers } from "@/components/ui/leaderboard/TopPerformers";
// import { supabase } from "@/lib/supabase";
import { Tabs as UITabs, TabsContent as UITabsContent, TabsList as UITabsList, TabsTrigger as UITabsTrigger } from "@/components/ui/tabs";
import { getUser } from "@/actions/getUser";
import { User as userType } from "@prisma/client";
import { prisma } from "@/lib";
import { get } from "http";
import { useAuth } from "@/contexts/AuthContext";

export interface Participant {
  id: string;
  name: string;
  leetcodeHandle?: string;
  codeforcesHandle?: string;
  codechefHandle?: string;
  leetcodeRating?: number;
  leetcodeProblemsSolved?: number;
  codeforcesRating?: number;
  codeforcesProblemsSolved?: number;
  codechefRating?: number;
  codechefProblemsSolved?: number;
  totalScore?: number;
  rank?: number;
  avatar?: string;
  lastUpdated: string;
}

export default function LeaderboardPage() {
  // Add this near other state declarations
  const { user } = useAuth();
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);

  const [participants, setParticipants] = useState<userType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("totalScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overall");

  // Fetch participants data from Supabase


  useEffect(() => {
    async function fetchParticipants() {
      try {
        setIsLoading(true);
        const users = await getUser();


        // Add rank to each user based on position
        const rankedUsers = users.map((user, index) => ({
          ...user,
          rank: index + 1
        }));

        setParticipants(rankedUsers);
      } catch (error) {
        console.error('Failed to fetch participants:', error);
      } finally {
        setIsLoading(false);

      }
    }

    fetchParticipants();
  }, []);


  // Function to handle sorting
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
  };

  // Function to filter participants based on search query
  const filteredParticipants = participants.filter(participant =>
    participant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    participant.leetcodeHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    participant.codeforcesHandle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    participant.codechefHandle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Function to sort participants
  const getSortedParticipants = (platform: string = 'overall') => {
    let sortedList = [...filteredParticipants];

    if (platform === 'leetcode') {
      // Sort by LeetCode rating
      sortedList.sort((a, b) => b.leetcodeRating - a.leetcodeRating);
      // Add LeetCode-specific rank
      return sortedList.map((participant, index) => ({
        ...participant,
        platformRank: index + 1
      }));
    } else if (platform === 'codeforces') {
      // Sort by CodeForces rating
      sortedList.sort((a, b) => b.codeforcesRating - a.codeforcesRating);
      // Add CodeForces-specific rank
      return sortedList.map((participant, index) => ({
        ...participant,
        platformRank: index + 1
      }));
    } else if (platform === 'codechef') {
      // Sort by CodeChef rating
      sortedList.sort((a, b) => b.codechefRating - a.codechefRating);
      // Add CodeChef-specific rank
      return sortedList.map((participant, index) => ({
        ...participant,
        platformRank: index + 1
      }));
    } else {
      // Overall sorting based on selected sort criteria
      let aValue, bValue;

      return [...filteredParticipants].sort((a, b) => {
        switch (sortBy) {
          case "name":
            aValue = a.name;
            bValue = b.name;
            return sortOrder === "asc"
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          case "leetcodeRating":
            aValue = a.leetcodeRating;
            bValue = b.leetcodeRating;
            break;
          case "leetcodeProblemsSolved":
            aValue = a.leetcodeProblemsSolved;
            bValue = b.leetcodeProblemsSolved;
            break;
          case "codeforcesRating":
            aValue = a.codeforcesRating;
            bValue = b.codeforcesRating;
            break;
          case "codeforcesProblemsSolved":
            aValue = a.codeforcesProblemsSolved;
            bValue = b.codeforcesProblemsSolved;
            break;
          case "codechefRating":
            aValue = a.codechefRating;
            bValue = b.codechefRating;
            break;
          case "codechefProblemsSolved":
            aValue = a.codechefProblemsSolved;
            bValue = b.codechefProblemsSolved;
            break;
          default:
            aValue = a.codeforcesProblemsSolved;
            bValue = b.codechefProblemsSolved;
        }

        return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
      });
    }
  };

  // Get platform-specific top performers
  const getTopPerformers = (platform: string) => {
    if (platform === 'leetcode') {
      return [...participants]
        .sort((a, b) => b.leetcodeRating - a.leetcodeRating)
        .slice(0, 3);
    } else if (platform === 'codeforces') {
      return [...participants]
        .sort((a, b) => b.codeforcesRating - a.codeforcesRating)
        .slice(0, 3);
    } else if (platform === 'codechef') {
      return [...participants]
        .sort((a, b) => b.codechefRating - a.codechefRating)
        .slice(0, 3);
    } else {
      return participants.slice(0, 3);
    }
  };

  // Function to handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {

      // Just simulate a refresh with the current data
      setTimeout(() => {
        setRefreshing(false);
      }, 1000);
      return;



      const data = await getUser();
      // Add rank to each participant based on their position
      const rankedData = data.map((participant, index) => ({
        ...participant,
        rank: index + 1
      }));

      setParticipants(rankedData);
    } catch (error) {
      console.error('Failed to refresh participants:', error);
      // Don't change the current data on error
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate stats
  const getStats = (platform: string = 'overall') => {
    if (platform === 'leetcode') {
      return [
        {
          icon: User,
          value: participants.filter(p => p.leetcodeHandle).length.toString(),
          label: "LeetCode Users"
        },
        {
          icon: Code,
          value: participants.reduce((sum, p) => sum + p.leetcodeProblemsSolved, 0).toString(),
          label: "Problems Solved"
        },
        {
          icon: Trophy,
          value: Math.max(...participants.map(p => p.leetcodeRating || 0)).toString(),
          label: "Highest Rating"
        },
        {
          icon: Sparkles,
          value: Math.round(participants.reduce((sum, p) => sum + p.leetcodeProblemsSolved, 0) /
            Math.max(participants.filter(p => p.leetcodeHandle).length, 1)).toString(),
          label: "Avg. Problems"
        }
      ];
    } else if (platform === 'codeforces') {
      return [
        {
          icon: User,
          value: participants.filter(p => p.codeforcesHandle).length.toString(),
          label: "CodeForces Users"
        },
        {
          icon: Code,
          value: participants.reduce((sum, p) => sum + p.codeforcesProblemsSolved, 0).toString(),
          label: "Problems Solved"
        },
        {
          icon: Trophy,
          value: Math.max(...participants.map(p => p.codeforcesRating || 0)).toString(),
          label: "Highest Rating"
        },
        {
          icon: Sparkles,
          value: Math.round(participants.reduce((sum, p) => sum + p.codeforcesProblemsSolved, 0) /
            Math.max(participants.filter(p => p.codeforcesHandle).length, 1)).toString(),
          label: "Avg. Problems"
        }
      ];
    } else if (platform === 'codechefHandle') {
      return [
        {
          icon: User,
          value: participants.filter(p => p.codechefProblemsSolved).length.toString(),
          label: "CodeChef Users"
        },
        {
          icon: Code,
          value: participants.reduce((sum, p) => sum + p.codechefProblemsSolved, 0).toString(),
          label: "Problems Solved"
        },
        {
          icon: Trophy,
          value: Math.max(...participants.map(p => p.codechefRating || 0)).toString(),
          label: "Highest Rating"
        },
        {
          icon: Sparkles,
          value: Math.round(participants.reduce((sum, p) => sum + p.codechefProblemsSolved, 0) /
            Math.max(participants.filter(p => p.codechefHandle).length, 1)).toString(),
          label: "Avg. Problems"
        }
      ];
    } else {
      // Overall stats
      return [
        {
          icon: User,
          value: participants.length.toString(),
          label: "Participants"
        },
        {
          icon: Code,
          value: participants.reduce((sum, p) => sum + p.leetcodeProblemsSolved + p.codeforcesProblemsSolved + p.codechefProblemsSolved, 0).toString(),
          label: "Problems Solved"
        },
        {
          icon: Trophy,
          value: Math.max(...participants.map(p => p.totalScore)).toString(),
          label: "Highest Score"
        },
        {
          icon: Sparkles,
          value: Math.max(...participants.map(p => p.leetcodeRating)).toString(),
          label: "Top LeetCode Rating"
        }
      ];
    }
  };

  return (
    <div ref={containerRef} className="relative min-h-screen bg-gradient-to-br from-indigo-900 via-[#030303] to-rose-900">
      <BackgroundSparkles />
      <Header1 />

      {/* Hero Section */}
      <motion.div
        style={{ y }}
        className="container mx-auto px-4 pt-24 pb-20"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.h1
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-6xl font-bold text-white mb-6"
          >
            Coding <span className="text-blue-400">Leaderboard</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-white/70 text-lg"
          >
            Track your progress and compete with fellow coders across multiple platforms
          </motion.p>
        </motion.div>

        {/* Platform Tabs */}
        <UITabs defaultValue="overall" onValueChange={setActiveTab} className="w-full mb-8">
          <UITabsList className="grid grid-cols-4 max-w-2xl mx-auto">
            <UITabsTrigger value="overall" className="data-[state=active]:bg-blue-600">Overall</UITabsTrigger>
            <UITabsTrigger value="leetcode" className="data-[state=active]:bg-blue-600">LeetCode</UITabsTrigger>
            <UITabsTrigger value="codeforcesHandle" className="data-[state=active]:bg-blue-600">CodeForces</UITabsTrigger>
            <UITabsTrigger value="codechefHandle" className="data-[state=active]:bg-blue-600">CodeChef</UITabsTrigger>
          </UITabsList>

          {/* Overall Tab Content */}
          <UITabsContent value="overall" className="mt-6">
            {/* Stats Section */}
            <LeaderboardStats stats={getStats('overall')} />

            {/* Top Performers */}
            <TopPerformers participants={getTopPerformers('overall')} />

            {/* Main Content */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mt-16">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search participants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="border-white/10 text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  {user && (
                    <Button
                      onClick={() => setShowForm(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full md:w-auto"
                    >
                      Join Leaderboard
                    </Button>
                  )}
                </div>
              </div>

              {/* Leaderboard Table */}
              <LeaderboardTable
                participants={getSortedParticipants('overall')}
                sortBy={sortBy}
                sortOrder={sortOrder}
                handleSort={handleSort}
                isLoading={isLoading}
              />
            </div>
          </UITabsContent>

          {/* LeetCode Tab Content */}
          <UITabsContent value="leetcode" className="mt-6">
            {/* Stats Section */}
            <LeaderboardStats stats={getStats('leetcode')} />

            {/* Top Performers */}
            <TopPerformers participants={getTopPerformers('leetcode')} />

            {/* Main Content */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mt-16">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search LeetCode users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="border-white/10 text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* LeetCode Leaderboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-4 text-left">Rank</th>
                      <th className="py-3 px-4 text-left">Participant</th>
                      <th className="py-3 px-4 text-left">LeetCode Username</th>
                      <th className="py-3 px-4 text-left">Rating</th>
                      <th className="py-3 px-4 text-left">Problems Solved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedParticipants('leetcode').map((participant, index) => (
                      <motion.tr
                        key={participant.id || index}
                        className={`border-b border-white/10 ${index < 3 ? "bg-gradient-to-r from-blue-500/20 to-transparent" : ""}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <td className="py-3 px-4">
                          {index + 1}
                          {index < 3 && (
                            <span className="ml-2">
                              {index === 0 && "🥇"}
                              {index === 1 && "🥈"}
                              {index === 2 && "🥉"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 flex items-center gap-3">
                          {participant.avatar ? (
                            <Image
                              src={participant.avatar}
                              alt={participant.name}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-400" />
                            </div>
                          )}
                          <span>{participant.name}</span>
                        </td>
                        <td className="py-3 px-4">{participant.leetcodeHandle}</td>
                        <td className="py-3 px-4">{participant.leetcodeRating}</td>
                        <td className="py-3 px-4">{participant.leetcodeProblemsSolved}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </UITabsContent>

          {/* CodeForces Tab Content */}
          <UITabsContent value="codeforcesHandle" className="mt-6">
            {/* Stats Section */}
            <LeaderboardStats stats={getStats('codeforcesHandle')} />

            {/* Top Performers */}
            <TopPerformers participants={getTopPerformers('codeforcesHandle')} />

            {/* Main Content */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mt-16">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search CodeForces users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="border-white/10 text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* CodeForces Leaderboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-4 text-left">Rank</th>
                      <th className="py-3 px-4 text-left">Participant</th>
                      <th className="py-3 px-4 text-left">CodeForces Username</th>
                      <th className="py-3 px-4 text-left">Rating</th>
                      <th className="py-3 px-4 text-left">Problems Solved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedParticipants('codeforcesHandle').map((participant, index) => (
                      <motion.tr
                        key={participant.id || index}
                        className={`border-b border-white/10 ${index < 3 ? "bg-gradient-to-r from-blue-500/20 to-transparent" : ""}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <td className="py-3 px-4">
                          {index + 1}
                          {index < 3 && (
                            <span className="ml-2">
                              {index === 0 && "🥇"}
                              {index === 1 && "🥈"}
                              {index === 2 && "🥉"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 flex items-center gap-3">
                          {participant.avatar ? (
                            <img
                              src={participant.avatar}
                              alt={participant.name}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-400" />
                            </div>
                          )}
                          <span>{participant.name}</span>
                        </td>
                        <td className="py-3 px-4">{participant.codeforcesHandle}</td>
                        <td className="py-3 px-4">{participant.codeforcesRating}</td>
                        <td className="py-3 px-4">{participant.codeforcesProblemsSolved}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </UITabsContent>

          {/* CodeChef Tab Content */}
          <UITabsContent value="codechefHandle" className="mt-6">
            {/* Stats Section */}
            <LeaderboardStats stats={getStats('codechefHandle')} />

            {/* Top Performers */}
            <TopPerformers participants={getTopPerformers('codechefHandle')} />

            {/* Main Content */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 mt-16">
              <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/40 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search CodeChef users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="border-white/10 text-white hover:bg-white/10"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* CodeChef Leaderboard Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-3 px-4 text-left">Rank</th>
                      <th className="py-3 px-4 text-left">Participant</th>
                      <th className="py-3 px-4 text-left">CodeChef Username</th>
                      <th className="py-3 px-4 text-left">Rating</th>
                      <th className="py-3 px-4 text-left">Problems Solved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getSortedParticipants('codechefHandle').map((participant, index) => (
                      <motion.tr
                        key={participant.id || index}
                        className={`border-b border-white/10 ${index < 3 ? "bg-gradient-to-r from-blue-500/20 to-transparent" : ""}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                      >
                        <td className="py-3 px-4">
                          {index + 1}
                          {index < 3 && (
                            <span className="ml-2">
                              {index === 0 && "🥇"}
                              {index === 1 && "🥈"}
                              {index === 2 && "🥉"}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 flex items-center gap-3">
                          {participant.avatar ? (
                            <img
                              src={participant.avatar}
                              alt={participant.name}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-400" />
                            </div>
                          )}
                          <span>{participant.name}</span>
                        </td>
                        <td className="py-3 px-4">{participant.codechefHandle}</td>
                        <td className="py-3 px-4">{participant.codechefRating}</td>
                        <td className="py-3 px-4">{"-"}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </UITabsContent>
        </UITabs>
      </motion.div>

      {/* Leaderboard Form Modal */}
      {showForm && (
        <LeaderboardForm
        />
      )}

      {/* Meteors Effect */}
      <Meteors number={20} />

      <Footer />
    </div>
  );
}