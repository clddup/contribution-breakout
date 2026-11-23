import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchCalendar, levels, parseCalendar } from '../action-dist/calendar.js';
import { simulate } from '../action-dist/simulation.js';
import { renderSvg, themes } from '../action-dist/svg.js';

function calendar(counts) {
  const weeks = [];
  counts.forEach((count, index) => {
    if (index % 7 === 0) weeks.push({ contributionDays: [] });
    const date = new Date(Date.UTC(2025, 10, 23 + index)).toISOString().slice(0, 10);
    weeks.at(-1).contributionDays.push({ date, weekday: index % 7, contributionCount: count, contributionLevel: levels[count] });
  });
  return { weeks, totalContributions: counts.reduce((total, count) => total + count, 0) };
}

test('the action reads calendar data using a GraphQL login variable', async () => {
  const fixture = calendar([0, 1, 2]);
  const body = { data: { user: { contributionsCollection: { contributionCalendar: fixture } } } };
  const mockRequest = async (url, options) => {
    assert.equal(url, 'https://api.github.com/graphql');
    assert.equal(options.headers.authorization, 'Bearer example');
    assert.deepEqual(JSON.parse(options.body).variables, { login: 'octocat' });
    return Response.json(body);
  };
  assert.deepEqual(await fetchCalendar('octocat', 'example', mockRequest), fixture);
});

test('reject malformed and inconsistent calendar data', () => {
  assert.throws(() => parseCalendar(null), /calendar/);
  const fixture = calendar([1]);
  assert.throws(() => parseCalendar({ ...fixture, totalContributions: 99 }), /does not match/);
  fixture.weeks[0].contributionDays[0].date = '"/><script>';
  assert.throws(() => parseCalendar(fixture), /Invalid contribution day/);
});

test('both themes preserve the same dates and counts without visible labels', () => {
  const fixture = calendar(Array.from({ length: 366 }, (_, index) => index % 13 === 0 ? index % 5 : 0));
  const game = simulate(fixture);
  const expected = fixture.weeks.flatMap(week => week.contributionDays)
    .filter(day => day.contributionCount > 0).map(day => [day.date, day.contributionCount]);
  assert.equal(game.bricks.flatMap(brick => brick.hits).length, fixture.totalContributions);
  assert.ok(game.bricks.every(brick => brick.clearedAt === brick.hits.at(-1)));
  assert.ok(game.wallHits > 0);
  for (const theme of Object.keys(themes)) {
    const image = renderSvg(game, theme);
    assert.match(image, /viewBox="0 0 1080 330"/);
    assert.match(image, /@keyframes/);
    assert.doesNotMatch(image, /<(?:script|text|title)\b/);
    const actual = [...image.matchAll(/class="brick" data-date="([^"]+)" data-count="(\d+)"/g)]
      .map(([, date, count]) => [date, Number(count)]);
    assert.deepEqual(actual, expected);
  }
});

test('empty and dense calendars both render', () => {
  const empty = simulate(calendar([0]));
  assert.doesNotMatch(renderSvg(empty, 'light'), /class="brick"|@keyframes/);
  const dense = simulate(calendar(Array(366).fill(4)));
  assert.equal(dense.bricks.length, 366);
  assert.ok(dense.bricks.every(brick => brick.hits.length === 4 && brick.clearedAt !== undefined));
  assert.ok(renderSvg(dense, 'dark').startsWith('<svg'));
});

test('playback rate rescales time without changing the path', () => {
  const fixture = calendar([4, 1, 0, 0, 3, 0]);
  const slow = simulate(fixture, 0.5);
  const normal = simulate(fixture, 1);
  assert.equal(slow.duration, normal.duration * 2);
  assert.deepEqual(slow.frames.map(([time, ...coordinates]) => [time / 2, ...coordinates]), normal.frames);
  assert.throws(() => simulate(fixture, 0), /Playback rate/);
});
