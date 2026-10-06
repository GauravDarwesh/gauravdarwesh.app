import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const INTERVALS_API = "https://intervals.icu/api/v1";
const SECRET_NAME = "Intervals";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

type RawActivity = {
  id?: string | number;
  type?: string | null;
  start_date_local?: string | null;
  icu_distance?: number | null;
  distance?: number | null;
  moving_time?: number | null;
};

type PublicActivity = {
  id: string;
  type: string;
  date: string;
  distanceKm: number;
  movingMinutes: number;
};

const startOfYearUtc = (year: number) => new Date(Date.UTC(year, 0, 1));

const endOfYearUtc = (year: number) => new Date(Date.UTC(year + 1, 0, 1));

const addUtcDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);


const toFiniteNumber = (value: unknown) => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
};

const fetchIntervalsActivities = async (
  apiKey: string,
  oldest: string,
  newest: string,
): Promise<RawActivity[]> => {
  const url = new URL(INTERVALS_API + "/athlete/0/activities");
  url.searchParams.set("oldest", oldest);
  url.searchParams.set("newest", newest);

  const auth = btoa("API_KEY:" + apiKey);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: "Basic " + auth,
    },
  });

  if (response.status === 204) return [];

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      "Intervals.icu returned " + response.status + ": " + body.slice(0, 180),
    );
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error("Intervals.icu returned an unexpected activity payload.");
  }

  return data as RawActivity[];
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = Deno.env.get(SECRET_NAME);

    if (!apiKey) {
      throw new Error('Missing Supabase secret "' + SECRET_NAME + '".');
    }

    const now = new Date();
    const { year: currentYear, month: currentMonth, day: currentDay } =
      datePartsInIndia(now);

    const oldestDate = startOfYearUtc(currentYear);
    const newestDate = new Date(Date.UTC(currentYear, currentMonth, currentDay));

    const oldest = formatYmd(oldestDate);
    const newest = formatYmd(newestDate);

    const rawActivities = await fetchIntervalsActivities(apiKey, oldest, newest);

    const publicActivities: PublicActivity[] = rawActivities
      .filter((activity) => Boolean(activity.start_date_local))
      .map((activity) => {
        const distanceMeters =
          toFiniteNumber(activity.icu_distance) ||
          toFiniteNumber(activity.distance);

        return {
          id: String(
            activity.id ??
              (String(activity.start_date_local) +
                "-" +
                String(activity.type ?? "Activity")),
          ),
          type: String(activity.type ?? "Activity"),
          date: String(activity.start_date_local),
          distanceKm: Math.max(0, distanceMeters / 1000),
          movingMinutes: Math.max(
            0,
            toFiniteNumber(activity.moving_time) / 60,
          ),
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const days = [];
    const yearStart = startOfYearUtc(currentYear);
    const yearEnd = endOfYearUtc(currentYear);

    for (let cursor = yearStart; cursor < yearEnd; cursor = addUtcDays(cursor, 1)) {
      const key = formatYmd(cursor);
      const activities = publicActivities.filter(
        (activity) => activity.date.slice(0, 10) === key,
      );

      days.push({
        date: key,
        count: activities.length,
        activities,
      });
    }

    const totals = publicActivities.reduce(
      (sum, activity) => ({
        activities: sum.activities + 1,
        distanceKm: sum.distanceKm + activity.distanceKm,
        movingMinutes: sum.movingMinutes + activity.movingMinutes,
      }),
      { activities: 0, distanceKm: 0, movingMinutes: 0 },
    );

    const payload = {
      source: "Intervals.icu",
      year: currentYear,
      from: oldest,
      to: newest,
      totals,
      days,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control":
          "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Intervals activity fetch failed:", error);

    return new Response(
      JSON.stringify({
        error: "Unable to load training activity right now.",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
