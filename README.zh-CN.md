# GitHub 贡献图打砖块

[English](README.md)

把 GitHub 贡献日历变成打砖块动画：有贡献的日期是砖块，贡献等级决定砖块要打几次才会碎。GitHub Action 会生成深浅两张透明 SVG，可以直接放进个人主页，不用申请 Token 或搭服务。

[查看实际效果](https://github.com/clddup)

## 安装

1. 在与 GitHub 用户名同名的公开仓库（例如 `octocat/octocat`）的默认分支，新建 `.github/workflows/breakout.yml`，粘贴[工作流示例](README.md#1-add-the-workflow)。示例每天运行一次，也支持手动运行。
2. 打开 **Actions → Update contribution breakout → Run workflow**。等首次运行成功后，确认 `breakout-output` 分支下有 `breakout-light.svg` 和 `breakout-dark.svg`。
3. 把[图片引用](README.md#3-embed-the-animation)加到个人主页 README，将两处 `USER/REPO` 替换成自己的仓库名。

## 常见问题

- 找不到 **Run workflow**：确认工作流在默认分支上，并且仓库已启用 Actions。
- 发布步骤失败：确认任务有 `contents: write`，且仓库规则允许工作流写入 `breakout-output`。
- 图片不显示：先直接打开图片地址，检查仓库名、分支名以及首次运行是否成功。

[配置项](README.md#action-inputs) · [反馈问题](https://github.com/clddup/contribution-breakout/issues/new) · [MIT 许可证](LICENSE)
