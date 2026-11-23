# Contribution Breakout

Turn your GitHub contribution calendar into a Breakout animation for your profile. Each active day becomes a brick, and the contribution level determines how many hits it takes to break. The action generates transparent light and dark SVGs with no scripts, labels, or borders.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/clddup/clddup/breakout-output/breakout-dark.svg">
  <img src="https://raw.githubusercontent.com/clddup/clddup/breakout-output/breakout-light.svg" alt="Contribution Breakout in the clddup GitHub profile">
</picture>

## Add it to your profile

1. Create `.github/workflows/breakout.yml` in your profile repository (for example, `octocat/octocat`). The action reads the calendar and writes both images to `dist`. The separate publishing step writes them to an image-only branch named `breakout-output`.

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

2. Push the workflow to your default branch, then run **Update contribution breakout** once from the **Actions** tab. Subsequent runs are scheduled by GitHub; they can start later than the configured time.
3. Add this snippet to your profile README after the first run succeeds. Replace both `USER/REPO` placeholders with the owner and name of your profile repository.

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

## Development

Use Node.js 24 or later. Install the development dependencies and run the tests:

```sh
pnpm install --frozen-lockfile
pnpm test
```

`test` compiles the TypeScript and runs Node's built-in test runner. Commit the updated `action-dist/` JavaScript when you change the source; GitHub uses those files directly, so there is no npm package to install.

## License

[MIT](LICENSE).
