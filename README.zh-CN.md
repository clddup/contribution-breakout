# GitHub 贡献图打砖块

[English](README.md)

把 GitHub 贡献图变成个人主页上的打砖块动画。有贡献的日期会变成砖块，贡献等级越高，需要击中的次数越多。GitHub Actions 定时生成浅色和深色两张透明 SVG，不用申请个人访问令牌、不用安装 npm 包，也不用自己搭服务。

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/clddup/clddup/breakout-output/breakout-dark.svg">
  <img src="https://raw.githubusercontent.com/clddup/clddup/breakout-output/breakout-light.svg" alt="clddup 的 GitHub 贡献图打砖块动画">
</picture>

[在 GitHub 个人主页查看效果](https://github.com/clddup)

## 快速开始

### 1. 添加工作流

要把动画放在 GitHub 个人主页上，请使用与用户名同名的公开仓库，例如 `octocat/octocat`。在仓库的默认分支创建 `.github/workflows/breakout.yml`，粘贴下面的工作流。生成步骤将两张 SVG 写入 `dist`，发布步骤再把它们推送到 `breakout-output` 分支。

如果已经把 `breakout-output` 分支用作其他用途，请换一个专门存放图片的分支，并同时修改工作流里的 `target_branch` 和下方的图片地址。

```yaml
name: Update contribution breakout

on:
  schedule:
    - cron: "17 0 * * *" # UTC 00:17，即北京时间 08:17，每天一次
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

### 2. 生成第一组图片

推送工作流后，打开 **Actions → Update contribution breakout → Run workflow**。等首次运行成功，确认 `breakout-output` 分支里有 `breakout-light.svg` 和 `breakout-dark.svg`。之后 GitHub 会按计划自动更新图片，实际启动时间可能比设定时间晚。

### 3. 在主页嵌入动画

把下面的代码加到个人主页的 README。将两处 `USER/REPO` 换成你的仓库名，例如 `octocat/octocat`。图片会跟随浏览器或系统的明暗偏好切换。

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/USER/REPO/breakout-output/breakout-dark.svg">
  <img src="https://raw.githubusercontent.com/USER/REPO/breakout-output/breakout-light.svg" alt="GitHub 贡献图打砖块动画">
</picture>
```

## Action 配置项

| 配置项 | 默认值 | 说明 |
| --- | --- | --- |
| `github_user_name` | 仓库所有者 | 要读取贡献日历的 GitHub 用户名。 |
| `github_token` | `${{ github.token }}` | 查询 GitHub API 的令牌。按示例使用时，不需要另建 Secret。 |
| `output_dir` | `dist` | 两张 SVG 的输出目录。修改时，发布步骤的 `build_dir` 也要一起改。 |
| `playback_rate` | `0.5` | 动画相对于模拟过程的播放速度。必须大于 0 且不超过 2；`1` 为原速，`0.5` 为半速。 |

GitHub Actions 在 Node.js 24 上运行已经编译好的代码，调用者不用在工作流里安装包管理器或编译项目。生成 Action 只写入 SVG 文件，不会推送到仓库，不需要启用 GitHub Pages。`contents: write` 是发布步骤写入图片分支时需要的权限。

SVG 里包含令牌能读到的日期和贡献数量。如果改用其他令牌，请先确认这些数据可以公开。

## 常见问题

- **找不到 Run workflow：** 确认仓库已启用 Actions，并且工作流在默认分支上。
- **发布步骤失败：** 确认任务配置了 `contents: write`，且仓库规则允许工作流写入 `breakout-output`。
- **图片不显示：** 直接打开两个原始图片地址。如果返回 404，检查仓库名、输出分支名，以及首次运行是否成功。

[反馈问题](https://github.com/clddup/contribution-breakout/issues/new)时可以附上相关工作流日志，请勿贴出令牌。

## 开发与测试

如果要修改 Action 源码，请使用 Node.js 24 或更高版本，安装开发依赖后运行测试：

```sh
pnpm install --frozen-lockfile
pnpm test
```

测试命令会先编译 TypeScript，再运行 Node.js 自带的测试工具。修改源码后，请一并提交 `action-dist/` 下更新的 JavaScript；GitHub 会直接运行这些编译产物，不从 npm 安装。

## 许可证

[MIT](LICENSE)。
