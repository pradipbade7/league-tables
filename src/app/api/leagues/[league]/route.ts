import { NextResponse, type RouteHandlerContext } from 'next/server';
import leagues from '../../../data/leagues.json';

// Define proper interface for cache items
interface CacheItem {
  data: TeamData[];
  timestamp: number;
}

// Use the TeamData interface that's already defined elsewhere
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

// Cache object to store league data
const cache: Record<string, CacheItem> = {};
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds
const MAX_RETRY_COUNT = 3;

export async function GET(
  request: Request,
  context: RouteHandlerContext<{ league: string }>
) {
  try {
    // Get the league slug from params
    const leagueSlug = context.params.league;

    // Find the league data to get the API code
    const leagueData = leagues.find(league => league.slug === leagueSlug);

    if (!leagueData) {
      return NextResponse.json({ error: "League not found" }, { status: 404 });
    }

    const apiCode = leagueData.apiCode;

    // Check if we have cached data that's still fresh
    if (cache[leagueSlug] && Date.now() - cache[leagueSlug].timestamp < CACHE_DURATION) {
      // Return cached data
      return NextResponse.json({
        data: cache[leagueSlug].data,
        cached: true,
        cachedAt: new Date(cache[leagueSlug].timestamp).toISOString(),
      });
    }

    // If no fresh cache, fetch from external API
    const tableData = await fetchLeagueData(apiCode);

    // Store in cache
    cache[leagueSlug] = {
      data: tableData,
      timestamp: Date.now(),
    };

    return NextResponse.json({ data: tableData, cached: false });
  } catch (error: unknown) {
    console.error("Error fetching league data:", error);

    const leagueSlug = context.params.league;

    // If we have stale cache data, return it as fallback with a warning
    if (cache[leagueSlug]) {
      return NextResponse.json({
        data: cache[leagueSlug].data,
        error: error instanceof Error ? error.message : 'Unknown error',
        cached: true,
        stale: true,
        cachedAt: new Date(cache[leagueSlug].timestamp).toISOString(),
      }, { status: 200 });
    }

    // Handle rate limit specifically
    if (
      error instanceof Error &&
      (error.message.includes('rate limit') ||
        ('status' in error && (error as { status: number }).status === 429))
    ) {
      return NextResponse.json({
        error: "API rate limit exceeded",
        rateLimited: true,
        retryAfter: 60, // Suggest retry after 60 seconds
      }, { status: 429 });
    }

    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

async function fetchLeagueData(apiCode: string, retryCount = 0): Promise<TeamData[]> {
  try {
    // Use the API code directly from leagues.json
    const response = await fetch(`https://api.football-data.org/v4/competitions/${apiCode}/standings`, {
      headers: {
        'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || '',
      },
    });

    // Check for rate limiting
    if (response.status === 429) {
      throw { message: 'API rate limit exceeded', status: 429 };
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }

    const data = await response.json();

    // Transform API data to match your expected format
    interface Entry {
      position: number;
      team: { name: string };
      playedGames: number;
      won: number;
      draw: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      points: number;
    }

    return data.standings[0].table.map((entry: Entry) => ({
      position: entry.position,
      team: entry.team.name,
      played: entry.playedGames,
      won: entry.won,
      drawn: entry.draw,
      lost: entry.lost,
      gf: entry.goalsFor,
      ga: entry.goalsAgainst,
      gd: entry.goalDifference,
      points: entry.points,
    }));
  } catch (error: unknown) {
    // Retry logic for transient errors
    if (retryCount < MAX_RETRY_COUNT && !(error instanceof Object && 'status' in error)) {
      console.log(`Retrying fetch for ${apiCode}, attempt ${retryCount + 1}`);
      // Exponential backoff
      await new Promise(res => setTimeout(res, Math.pow(2, retryCount) * 1000));
      return fetchLeagueData(apiCode, retryCount + 1);
    }

    throw error;
  }
}