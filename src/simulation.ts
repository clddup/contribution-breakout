import { levels, type Calendar, type Day } from './calendar.js';

export const left = 38;
export const right = 1042;
export const paddleY = 406;
export const halfPaddle = 45;
export const size = 13;
export const radius = 5.5;
const top = 109;
const speed = 610;
const dt = 1 / 180;
const maxAngle = 78 * (Math.PI / 180);
const fieldLeft = left + radius;
const fieldRight = right - radius;
const fieldWidth = fieldRight - fieldLeft;

interface Cell extends Day { x: number; y: number }
interface Brick extends Cell { hp: number; initialHp: number; hits: number[]; clearedAt?: number }
export type Frame = [time: number, x: number, y: number, paddleX: number];

export interface Game {
  cells: Cell[];
  bricks: Brick[];
  frames: Frame[];
  duration: number;
  wallHits: number;
}

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

function reflectedX(x: number) {
  let position = (x - fieldLeft) % (2 * fieldWidth);
  if (position < 0) position += 2 * fieldWidth;
  return fieldLeft + (position <= fieldWidth ? position : 2 * fieldWidth - position);
}

function paddlePlan(bricks: Brick[], hitX: number, lastAngle: number) {
  let bestCost = Infinity;
  let bestCenter: number | undefined;
  for (const brick of bricks) {
    if (!brick.hp) continue;
    const targetX = brick.x + size / 2 - fieldLeft;
    const rise = paddleY - radius - brick.y - size / 2;
    // Mirrored targets account for real side-wall bounces.
    for (const tile of [-1, 0, 1]) {
      for (const direction of [-1, 1]) {
        const dx = fieldLeft + 2 * tile * fieldWidth + direction * targetX - hitX;
        const angle = Math.atan2(dx, rise);
        const degrees = Math.abs(angle * (180 / Math.PI));
        if (degrees < 30 || degrees > 76) continue;
        const center = hitX - angle / maxAngle * halfPaddle;
        if (center < left + halfPaddle || center > right - halfPaddle) continue;
        const cost = Math.hypot(dx, rise) + Math.abs(degrees - 46) * 3 + (angle * lastAngle > 0 ? 45 : 0);
        if (bestCenter === undefined || cost < bestCost || (cost === bestCost && center < bestCenter)) {
          bestCost = cost;
          bestCenter = center;
        }
      }
    }
  }
  // Near a wall, the edge of the paddle can send the ball into that wall.
  const offset = hitX > (left + right) / 2 ? 30 : -30;
  return bestCenter ?? clamp(hitX - offset, left + halfPaddle, right - halfPaddle);
}

export function simulate(calendar: Calendar, playbackRate = 0.5): Game {
  if (!(playbackRate > 0 && playbackRate <= 2)) throw new Error('Playback rate must be greater than 0 and at most 2.');
  const cells = calendar.weeks.flatMap((week, index) => week.contributionDays.map(day => ({
    ...day, x: 63 + index * 18, y: 133 + day.weekday * 18,
  })));
  const bricks = cells.filter(day => day.contributionCount > 0).map((day): Brick => {
    const hp = levels.indexOf(day.contributionLevel);
    return { ...day, hp, initialHp: hp, hits: [] };
  });
  if (!bricks.length) return { cells, bricks, frames: [], duration: 0, wallHits: 0 };

  const first = bricks.reduce((best, brick) => brick.y > best.y ||
    (brick.y === best.y && Math.abs(brick.x - 540) < Math.abs(best.x - 540)) ? brick : best);
  let x = first.x + size / 2 - 80;
  let y = 330;
  const launchAngle = 42 * (Math.PI / 180);
  let vx = speed * Math.sin(launchAngle);
  let vy = -speed * Math.cos(launchAngle);
  let paddleX = clamp(x, left + halfPaddle, right - halfPaddle);
  let desiredPaddle = paddleX;
  const frames: Frame[] = [[0, x, y, paddleX]];
  let cleared = 0;
  let lastAngle = 0;
  let wallHits = 0;
  // Dense calendars can require four hits on nearly every day of the year.
  const maxSeconds = Math.max(600, bricks.reduce((hits, brick) => hits + brick.initialHp, 0));
  for (let tick = 1; tick < Math.floor(maxSeconds / dt); tick++) {
    const t = tick * dt;
    if (vy > 0 && tick % 6 === 1) {
      const fallTime = Math.max(0, (paddleY - radius - y) / vy);
      desiredPaddle = paddlePlan(bricks, reflectedX(x + vx * fallTime), lastAngle);
    }
    paddleX += clamp(desiredPaddle - paddleX, -1800 * dt, 1800 * dt);
    const oldX = x;
    const oldY = y;
    x += vx * dt;
    y += vy * dt;
    let collision = false;
    if (x < fieldLeft || x > fieldRight) {
      vx = x < fieldLeft ? Math.abs(vx) : -Math.abs(vx);
      x = clamp(x, fieldLeft, fieldRight);
      collision = true;
      wallHits++;
    }
    if (y < top + radius) {
      y = top + radius;
      vy = Math.abs(vy);
      collision = true;
    }
    if (vy > 0 && y + radius >= paddleY) {
      if (Math.abs(x - paddleX) > halfPaddle + radius) throw new Error('Predictive paddle missed the ball.');
      y = paddleY - radius;
      collision = true;
      lastAngle = clamp((x - paddleX) / halfPaddle, -1, 1) * maxAngle;
      vx = speed * Math.sin(lastAngle);
      vy = -speed * Math.cos(lastAngle);
    }
    for (const brick of bricks) {
      if (!brick.hp) continue;
      const { x: bx, y: by } = brick;
      const nearX = clamp(x, bx, bx + size);
      const nearY = clamp(y, by, by + size);
      if ((x - nearX) ** 2 + (y - nearY) ** 2 > radius ** 2) continue;
      if (oldY + radius <= by) {
        y = by - radius - 0.01;
        vy = -Math.abs(vy);
      } else if (oldY - radius >= by + size) {
        y = by + size + radius + 0.01;
        vy = Math.abs(vy);
      } else if (oldX + radius <= bx) {
        x = bx - radius - 0.01;
        vx = -Math.abs(vx);
      } else if (oldX - radius >= bx + size) {
        x = bx + size + radius + 0.01;
        vx = Math.abs(vx);
      } else {
        // Resolve a corner on the shallower axis.
        if (Math.min(Math.abs(x - bx), Math.abs(x - bx - size)) < Math.min(Math.abs(y - by), Math.abs(y - by - size))) {
          [x, vx] = x < bx + size / 2 ? [bx - radius - 0.01, -Math.abs(vx)] : [bx + size + radius + 0.01, Math.abs(vx)];
        } else {
          [y, vy] = y < by + size / 2 ? [by - radius - 0.01, -Math.abs(vy)] : [by + size + radius + 0.01, Math.abs(vy)];
        }
      }
      brick.hits.push(t / playbackRate);
      if (--brick.hp === 0) {
        brick.clearedAt = t / playbackRate;
        cleared++;
      }
      collision = true;
      break;
    }
    if (collision || tick % 6 === 0) frames.push([t / playbackRate, x, y, paddleX]);
    if (cleared === bricks.length) {
      frames.push([(t + 0.2) / playbackRate, x, y, paddleX], [(t + 4) / playbackRate, x, y, paddleX]);
      return { cells, bricks, frames, duration: frames[frames.length - 1][0], wallHits };
    }
  }
  throw new Error(`Simulation did not finish: ${cleared}/${bricks.length} bricks cleared.`);
}
