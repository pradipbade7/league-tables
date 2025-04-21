"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import leagues from "../../data/leagues.json";
import Image from "next/image";

type QualificationStatus =
  | "championsLeague"
  | "championsLeagueQualifier"
  | "europaLeague"
  | "conferenceLeague"
  | "relegation"
  | "playoff"
  | "none";

interface TeamData {
  position: number;
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export default function LeagueTable() {
  const params = useParams();
  const leagueSlug = params.league as string;

  const [tableData, setTableData] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [isCached, setIsCached] = useState(false);
  const [cachedTime, setCachedTime] = useState<string | null>(null);

  const leagueData = leagues.find((league) => league.slug === leagueSlug);

  // Function to determine qualification status based on position and league rules
  const getQualificationStatus = (position: number): QualificationStatus => {
    if (!leagueData?.positions) return "none";

    const { positions } = leagueData;

    if (positions.championsLeague?.includes(position)) {
      return "championsLeague";
    } else if (positions.championsLeagueQualifier?.includes(position)) {
      return "championsLeagueQualifier";
    } else if (positions.europaLeague?.includes(position)) {
      return "europaLeague";
    } else if (positions.conferenceLeague?.includes(position)) {
      return "conferenceLeague";
    } else if (positions.relegation?.includes(position)) {
      return "relegation";
    } else if (positions.playoff?.includes(position)) {
      return "playoff";
    }

    return "none";
  };

  // Function to get qualification style based on status
  const getPositionStyle = (status: QualificationStatus) => {
    switch (status) {
      case "championsLeague":
        return "border-l-4 border-blue-500";
      case "championsLeagueQualifier":
        return "border-l-4 border-blue-500";
      case "europaLeague":
        return "border-l-4 border-orange-500";
      case "conferenceLeague":
        return "border-l-4 border-green-500";
      case "relegation":
        return "border-l-4 border-red-500";
      case "playoff":
        return "border-l-4 border-amber-500";
      default:
        return "";
    }
  };

  // Get qualification badge text
  const getQualificationBadge = (status: QualificationStatus) => {
    switch (status) {
      case "championsLeague":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            UCL
          </span>
        );
      case "europaLeague":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
            UEL
          </span>
        );
      case "conferenceLeague":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            UECL
          </span>
        );
      case "relegation":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            REL
          </span>
        );
      case "playoff":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            P/O
          </span>
        );
      default:
        return null;
    }
  };

  // Function to fetch data that can be called multiple times
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setIsRateLimited(false);

      const response = await fetch(`/api/leagues/${leagueSlug}`);
      const result = await response.json();

      if (response.status === 429) {
        // Handle rate limiting
        setIsRateLimited(true);
        setRetryCountdown(result.retryAfter || 60);
        // Start countdown
        startCountdown(result.retryAfter || 60);
      } else if (!response.ok) {
        throw new Error(result.error || "Failed to load data");
      } else {
        // Success
        setTableData(result.data);
        setIsCached(result.cached || false);
        setCachedTime(result.cachedAt || null);

        if (result.stale) {
          setError(
            "Warning: Using stale data from cache. Fresh data could not be loaded."
          );
        } else {
          setError(null);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [leagueSlug]);

  // Countdown function for rate limiting
  const startCountdown = (seconds: number) => {
    setRetryCountdown(seconds);

    const interval = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          // Auto-retry when countdown reaches zero
          fetchData();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  };

  // Initial data fetch
  useEffect(() => {
    if (leagueSlug) {
      fetchData();
    }
  }, [leagueSlug, fetchData]);

  // If league not found, show error
  if (!leagueData) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold text-red-600">League not found</h1>
        <p className="mt-2 text-gray-600">
          The league you are looking for doesnot exist.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-emerald-600 hover:underline"
        >
          Back to leagues
        </Link>
      </div>
    );
  }

  // Handle rate limiting UI
  if (isRateLimited) {
    return (
      <div>
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-800"
          >
            <svg
              className="mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Back to leagues
          </Link>

          <div
            className={`${leagueData.bgColor} rounded-xl shadow-md overflow-hidden mt-4`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {leagueData.name}
                  </h1>
                </div>
                <Image
                  src={leagueData.logo}
                  alt={`${leagueData.name} logo`}
                  width={64}
                  height={64}
                  className="h-16 w-auto object-contain"
                  unoptimized={leagueData.logo.startsWith("http")}
                />{" "}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 text-center">
          <div className="text-amber-600 text-xl mb-4">
            API rate limit exceeded
          </div>
          <p className="text-gray-600 mb-4">
            We have reached our limit for data requests. The table will
            automatically reload in:
          </p>
          <div className="text-2xl font-bold mb-6">
            {retryCountdown} seconds
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
          >
            Try again now
          </button>
        </div>
      </div>
    );
  }

  // Handle loading state
  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-800"
          >
            <svg
              className="mr-2 h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Back to leagues
          </Link>

          <div
            className={`${leagueData.bgColor} rounded-xl shadow-md overflow-hidden mt-4`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {leagueData.name}
                  </h1>
                </div>
                <Image
                  src={leagueData.logo}
                  alt={`${leagueData.name} logo`}
                  width={64}
                  height={64}
                  className="h-16 w-auto object-contain"
                  unoptimized={leagueData.logo.startsWith("http")}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Current Standings
              </h3>
              <p className="mt-1 text-sm text-gray-500">2024-2025 Season</p>
            </div>
          </div>
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-800"
        >
          <svg
            className="mr-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Back to leagues
        </Link>

        <div
          className={`${leagueData.bgColor} rounded-xl shadow-md overflow-hidden mt-4`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {leagueData.name}
                </h1>
              </div>
              <Image
                src={leagueData.logo}
                alt={`${leagueData.name} logo`}
                width={64}
                height={64}
                className="h-16 w-auto object-contain"
                unoptimized={leagueData.logo.startsWith("http")}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Current Standings
            </h3>
            <p className="mt-1 text-sm text-gray-500">2024-2025 Season</p>
          </div>
          <div className="flex items-center">
            {isCached && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded mr-2">
                Cached{" "}
                {cachedTime
                  ? `at ${new Date(cachedTime).toLocaleTimeString()}`
                  : ""}
              </span>
            )}
            <button
              onClick={fetchData}
              className="ml-2 p-2 text-emerald-600 hover:text-emerald-800 rounded-full hover:bg-gray-100"
              title="Refresh data"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Qualification legend */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="inline-flex items-center">
              <span className="w-3 h-3 bg-blue-500 rounded-sm mr-1"></span>
              <span>Champions League</span>
            </div>
            <div className="inline-flex items-center">
              <span className="w-3 h-3 bg-orange-500 rounded-sm mr-1"></span>
              <span>Europa League</span>
            </div>
            <div className="inline-flex items-center">
              <span className="w-3 h-3 bg-green-500 rounded-sm mr-1"></span>
              <span>Conference League</span>
            </div>
            {leagueData.positions.playoff && (
              <div className="inline-flex items-center">
                <span className="w-3 h-3 bg-amber-500 rounded-sm mr-1"></span>
                <span>Relegation Playoff</span>
              </div>
            )}
            <div className="inline-flex items-center">
              <span className="w-3 h-3 bg-red-500 rounded-sm mr-1"></span>
              <span>Relegation</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Pos
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Team
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  P
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  W
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  D
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  L
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  GF
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  GA
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  GD
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.map((team, index) => {
                const qualificationStatus = getQualificationStatus(
                  team.position
                );
                const positionStyle = getPositionStyle(qualificationStatus);
                const badge = getQualificationBadge(qualificationStatus);

                return (
                  <tr key={index} className={`${positionStyle}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center">
                        <span className="mr-1">{team.position}</span>
                        {badge}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {team.team}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {team.played}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {team.won}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {team.drawn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {team.lost}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {team.gf}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {team.ga}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {team.gd}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 text-center">
                      {team.points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional section explaining qualification rules */}
      <div className="mt-6 bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Qualification Information
          </h3>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            {leagueData.positions.championsLeague && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Champions League
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  Positions {leagueData.positions.championsLeague.join(", ")}{" "}
                  qualify for the UEFA Champions League group stage.
                </dd>
              </div>
            )}

            {leagueData.positions.europaLeague && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Europa League
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  Positions {leagueData.positions.europaLeague.join(", ")}{" "}
                  qualify for the UEFA Europa League group stage.
                </dd>
              </div>
            )}

            {leagueData.positions.conferenceLeague && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Conference League
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  Position {leagueData.positions.conferenceLeague.join(", ")}{" "}
                  qualifies for the UEFA Europa Conference League.
                </dd>
              </div>
            )}

            {leagueData.positions.playoff && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Relegation Playoff
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  Position {leagueData.positions.playoff.join(", ")} enters a
                  relegation playoff.
                </dd>
              </div>
            )}

            {leagueData.positions.relegation && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Relegation
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  Positions {leagueData.positions.relegation.join(", ")} are
                  relegated.
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
