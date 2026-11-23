import { halfPaddle, paddleY, radius, size } from './simulation.js';
export const themes = {
    dark: { empty: '#161b22', accent: '#27964e', ball: '#ffd18a', ramp: ['#01311f', '#034525', '#0f6d31', '#00c647'] },
    light: { empty: '#ebedf0', accent: '#216e39', ball: '#a45019', ramp: ['#9be9a8', '#40c463', '#30a14e', '#216e39'] },
};
export function renderSvg(game, theme) {
    const { duration, frames } = game;
    const { empty, accent, ball, ramp } = themes[theme];
    const prefix = `breakout-${theme}`;
    const output = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="330" viewBox="0 0 1080 330" role="img" aria-label="GitHub 贡献打砖块动画" aria-describedby="${prefix}-desc" style="--empty:${empty};--accent:${accent};--ball:${ball}" data-duration="${duration.toFixed(5)}">`,
        `<desc id="${prefix}-desc">有贡献的日期变成砖块，球碰撞后砖块消失。颜色表示原始贡献等级，每个等级对应一到四点耐久。清场后循环。</desc>`,
        `<defs><filter id="${prefix}-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter></defs>`,
        '<g transform="translate(0 -96)">',
    ];
    const rules = [];
    function track(keyframes) {
        const name = `${prefix}-motion-${rules.length}`;
        const body = keyframes.map(([time, value]) => `${(time / duration * 100).toFixed(6)}%{${value}}`).join('');
        rules.push(`@keyframes ${name}{${body}}`);
        return name;
    }
    function animate(name, discrete = false, delay = 0) {
        return ` style="animation:${name} ${duration.toFixed(5)}s ${discrete ? 'steps(1,end)' : 'linear'} infinite;animation-delay:${delay}s"`;
    }
    const bricks = new Map(game.bricks.map(brick => [brick.date, brick]));
    for (const { date, x, y } of game.cells) {
        const rect = `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="3.5"`;
        output.push(`${rect} fill="var(--empty)" opacity=".3"/>`);
        const brick = bricks.get(date);
        if (!brick)
            continue;
        const { clearedAt, hits, initialHp, contributionCount } = brick;
        if (clearedAt === undefined)
            throw new Error('Cannot render an unfinished game.');
        const visibility = track([[0, 'visibility:visible'], [clearedAt, 'visibility:hidden'], [duration, 'visibility:hidden']]);
        const shades = ramp.slice(0, initialHp).reverse();
        let damage = '';
        if (initialHp > 1) {
            const times = [0, ...hits.slice(0, -1), duration];
            damage = animate(track(times.map((time, index) => [time, `fill:${shades[Math.min(index, shades.length - 1)]}`])), true);
        }
        output.push(`<g class="brick" data-date="${date}" data-count="${contributionCount}" data-cleared-at="${clearedAt.toFixed(6)}"${animate(visibility, true)}>${rect} fill="${shades[0]}"${damage}/></g>`);
        for (const time of hits) {
            const flash = track([[0, 'opacity:0'], [Math.max(0, time - 0.001), 'opacity:0'], [time, 'opacity:.9'], [time + 0.12, 'opacity:0'], [duration, 'opacity:0']]);
            output.push(`<circle class="impact" cx="${x + size / 2}" cy="${y + size / 2}" r="11" fill="none" stroke="var(--ball)" stroke-width="2" opacity="0"${animate(flash)}/>`);
        }
    }
    if (frames.length) {
        const paddle = track(frames.map(([time, , , x]) => [time, `transform:translateX(${(x - halfPaddle).toFixed(2)}px)`]));
        output.push(`<rect class="moving paddle" x="0" y="${paddleY}" width="${2 * halfPaddle}" height="9" rx="4.5" fill="var(--accent)"${animate(paddle)}/>`);
        const flight = track(frames.map(([time, x, y]) => [time, `transform:translate(${x.toFixed(2)}px,${y.toFixed(2)}px)`]));
        for (const [r, opacity, delay] of [[2, .10, .14], [3, .17, .09], [4, .26, .045], [11, .3, 0], [radius, 1, 0]]) {
            const blur = r === 11 ? ` filter="url(#${prefix}-glow)"` : '';
            output.push(`<circle class="moving ball" cx="0" cy="0" r="${r}" fill="var(--ball)" opacity="${opacity}"${blur}${animate(flight, false, delay)}/>`);
        }
    }
    return `${output.join('')}</g><style>${rules.join('')}@media(prefers-reduced-motion:reduce){.moving,.impact{display:none}.brick,.brick rect{animation:none!important}}</style></svg>\n`;
}
