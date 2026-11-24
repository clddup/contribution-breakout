# Contribution Breakout

[简体中文](README.zh-CN.md)

Turn your GitHub contribution graph into a Breakout animation for your profile README. The ball breaks bricks based on your real contribution days, and the GitHub Action generates light and dark SVGs on a schedule. No personal access token, npm package, or separate server is needed.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/clddup/clddup/breakout-output/breakout-dark.svg">
  <img src="https://raw.githubusercontent.com/clddup/clddup/breakout-output/breakout-light.svg" alt="Contribution Breakout in the clddup GitHub profile">
</picture>

[See it on a GitHub profile](https://github.com/clddup).

## Quick start

### 1. Add the workflow

For a GitHub profile README, use a public repository named after your username (for example, `octocat/octocat`). Add this workflow at `.github/workflows/breakout.yml` on its default branch. It generates both SVGs in `dist` and publishes them to a dedicated `breakout-output` branch.

If you already use a branch named `breakout-output` for something else, choose another name and update both the workflow and the image URLs below.

```yaml
name: Update contribution breakout

on:
  schedule:
    - cron: "17 0 * * *" # Daily at 00:17 UTC
  workflow_dispatch:

concurrency:
  group: contribution-breakout
  cancel-in-progress: false

jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    permissions:
      contents: write
    steps:
      - uses: clddup/contribution-breakout@v0.1.0
      - uses: crazy-max/ghaction-github-pages@1d6ee9b181a81033a16bd707a1401afa978daab4 # v5.0.0
        with:
          target_branch: breakout-output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ github.token }}
```

### 2. Generate the first images

After pushing the workflow, open **Actions → Update contribution breakout → Run workflow**. Wait for the run to succeed and check that `breakout-output` contains `breakout-light.svg` and `breakout-dark.svg`. GitHub refreshes them on the schedule; scheduled runs can start later than the configured time.

### 3. Embed the animation

Add the snippet to your profile README. Replace both `USER/REPO` placeholders with your repository, such as `octocat/octocat`.

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/USER/REPO/breakout-output/breakout-dark.svg">
  <img src="https://raw.githubusercontent.com/USER/REPO/breakout-output/breakout-light.svg" alt="GitHub contribution Breakout animation">
</picture>
```

## Action inputs

| Input | Default | Description |
| --- | --- | --- |
| `github_user_name` | Repository owner | GitHub username whose contribution calendar the action reads. |
| `github_token` | `${{ github.token }}` | Token used to query GitHub. No custom secret is needed for the example above. |
| `output_dir` | `dist` | Directory for `breakout-light.svg` and `breakout-dark.svg`. Match this to the publishing step's `build_dir`. |
| `playback_rate` | `0.5` | Playback speed relative to the simulation, greater than zero and at most `2`. |

GitHub Actions runs the compiled TypeScript action on Node.js 24. You do not need to install a package manager or build the action in your workflow. The action does not push to your repository or require GitHub Pages. The publishing step, not the generator, needs `contents: write`; use an output branch dedicated to generated files.

The SVGs contain the dates and counts the token can read. If you supply a different token, make sure you are comfortable publishing the calendar data that it can access.

## Troubleshooting

- **Run workflow is missing:** Check that Actions is enabled and that `.github/workflows/breakout.yml` is on the default branch.
- **Publishing fails:** Check that the job has `contents: write` and that repository rules allow the workflow to push to `breakout-output`.
- **The image is missing:** Open each raw image URL directly. If it returns 404, check the repository name, the output branch, and whether the first run succeeded.

[Report a problem](https://github.com/clddup/contribution-breakout/issues/new) with the relevant workflow log. Do not include tokens.

## Development

Use Node.js 24 or later. Install the development dependencies and run the tests:

```sh
pnpm install --frozen-lockfile
pnpm test
```

`test` compiles the TypeScript and runs Node's built-in test runner. Commit the updated `action-dist/` JavaScript when you change the source; GitHub uses those files directly, so there is no npm package to install.

## License

[MIT](LICENSE).
