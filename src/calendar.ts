export const levels = ['NONE', 'FIRST_QUARTILE', 'SECOND_QUARTILE', 'THIRD_QUARTILE', 'FOURTH_QUARTILE'] as const;
export type Level = (typeof levels)[number];

export interface Day {
  date: string;
  weekday: number;
  contributionCount: number;
  contributionLevel: Level;
}

export interface Calendar {
  totalContributions: number;
  weeks: { contributionDays: Day[] }[];
}

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : undefined;
}

export function parseCalendar(value: unknown): Calendar {
  const source = object(value);
  const weeks: unknown = source?.weeks;
  if (!Array.isArray(weeks) || weeks.length < 1 || weeks.length > 54) {
    throw new Error('Expected a GitHub contribution calendar with 1–54 weeks.');
  }
  const dates = new Set<string>();
  let totalContributions = 0;
  const parsed = weeks.map((entry: unknown) => {
    const days: unknown = object(entry)?.contributionDays;
    if (!Array.isArray(days) || days.length < 1 || days.length > 7) {
      throw new Error('Invalid contribution week.');
    }
    const weekdays = new Set<number>();
    const contributionDays = days.map((entry: unknown): Day => {
      const { date, weekday, contributionCount, contributionLevel } = object(entry) ?? {};
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || dates.has(date) ||
          typeof weekday !== 'number' || !Number.isInteger(weekday) || weekday < 0 || weekday > 6 || weekdays.has(weekday) ||
          typeof contributionCount !== 'number' || !Number.isSafeInteger(contributionCount) || contributionCount < 0 ||
          !levels.some(level => level === contributionLevel) || (contributionCount === 0) !== (contributionLevel === 'NONE')) {
        throw new Error('Invalid contribution day.');
      }
      dates.add(date);
      weekdays.add(weekday);
      totalContributions += contributionCount;
      return { date, weekday, contributionCount, contributionLevel: contributionLevel as Level };
    });
    return { contributionDays };
  });
  if (totalContributions !== source?.totalContributions) throw new Error('Contribution total does not match the calendar.');
  return { totalContributions, weeks: parsed };
}

export async function fetchCalendar(login: string, token: string, request = fetch): Promise<Calendar> {
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date weekday contributionCount contributionLevel } }
        }
      }
    }
  }`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response: Response | undefined;
    try {
      response = await request('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          'user-agent': 'contribution-breakout-action',
        },
        body: JSON.stringify({ query, variables: { login } }),
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      if (attempt === 3) throw new Error('Could not connect to the GitHub GraphQL API after three attempts.');
    }
    if (response?.ok) {
      const body = object(await response.json());
      const user = object(object(body?.data)?.user);
      if (Array.isArray(body?.errors) && body.errors.length) {
        throw new Error(`GitHub GraphQL could not load the contribution calendar for ${login}. Check the username and token permissions.`);
      }
      return parseCalendar(object(user?.contributionsCollection)?.contributionCalendar);
    }
    if (response) {
      await response.body?.cancel();
      if ((response.status < 500 && response.status !== 429) || attempt === 3) {
        throw new Error(`GitHub GraphQL returned HTTP ${response.status}.`);
      }
    }
    await new Promise(resolve => setTimeout(resolve, attempt * 2_000));
  }
  throw new Error('Could not fetch the contribution calendar.');
}
