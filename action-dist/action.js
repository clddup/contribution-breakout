import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fetchCalendar } from './calendar.js';
import { simulate } from './simulation.js';
import { renderSvg } from './svg.js';
try {
    const login = process.env.INPUT_GITHUB_USER_NAME?.trim() || process.env.GITHUB_REPOSITORY_OWNER;
    const token = process.env.INPUT_GITHUB_TOKEN?.trim();
    const output = process.env.INPUT_OUTPUT_DIR?.trim() || 'dist';
    const rate = Number(process.env.INPUT_PLAYBACK_RATE?.trim() || '0.5');
    if (!login || !token)
        throw new Error('A GitHub username and token are required.');
    if (!(rate > 0 && rate <= 2))
        throw new Error('Playback rate must be greater than 0 and at most 2.');
    const calendar = await fetchCalendar(login, token);
    const game = simulate(calendar, rate);
    const light = renderSvg(game, 'light');
    const dark = renderSvg(game, 'dark');
    await mkdir(output, { recursive: true });
    await Promise.all([
        writeFile(join(output, 'breakout-light.svg'), light),
        writeFile(join(output, 'breakout-dark.svg'), dark),
    ]);
    console.log(`Generated both SVGs: ${game.bricks.length} bricks, ${calendar.totalContributions} contributions.`);
}
catch (error) {
    console.error('Contribution Breakout:', error instanceof Error ? error.message : error);
    process.exitCode = 1;
}
