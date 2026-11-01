# 部署到 GitHub Pages

目标：拿到一个 **HTTPS 公开链接**，手机可访问、可发给任何人。

> 为什么必须 HTTPS：WebXR 与 `navigator.xr` 只在安全上下文（secure context）下可用。`file://` 不行，局域网 `http://192.168.x.x` 也不行（除 localhost）。

## 一键方式（推荐）

双击运行 `deploy.ps1`，或在终端执行：

```powershell
cd F:\ai.workspace\Wow\outwork\docs\upwork\vr_ar\webxr
.\deploy.ps1
```

脚本会依次完成：`gh` 登录校验 → `git init` + 首次提交 → 创建公开仓库 → 推送 → 开启 Pages → 打印访问地址。

自定义仓库名：

```powershell
.\deploy.ps1 -RepoName my-xr-demo
```

## 手动方式（等价步骤）

```powershell
cd F:\ai.workspace\Wow\outwork\docs\upwork\vr_ar\webxr
git init
git add -A
git commit -m "init: AR furniture placement WebXR demo"
gh repo create ar-furniture-webxr --public --source=. --remote=origin --push
```

然后去仓库 **Settings → Pages**：

| 项 | 值 |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` |
| Folder | `/ (root)` |

保存后等 1–3 分钟，访问 `https://<用户名>.github.io/ar-furniture-webxr/`。

## 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 打开是 404 | Pages 还没构建完，或分支/目录选错 | 等 3 分钟；核对 Settings → Pages |
| 页面白屏、控制台 `Failed to load module` | 用了相对路径但仓库根目录不是 `webxr/` | 确保把 `webxr/` 里的**内容**作为仓库根，而不是外层目录 |
| 手机打开卡顿 | 首屏要下 1.2MB 的 three.module.js | 正常。后续可换 `three.module.min.js` |
| VR 按钮显示 NOT SUPPORTED | 不在头显浏览器里 | 预期行为 |
| 私有仓库开了 Pages 却打不开 | 免费账号不支持私有仓库发布 Pages | 只能公开，或升级套餐 |

## 检查清单

- [ ] 链接能在自己手机上打开
- [ ] 手机能放置、能拖动（触摸有效）
- [ ] 控制台无红色报错
- [ ] 把链接发给一个朋友，他能自己操作

通过后，这个链接就是 Week 2 的正式交付物，可以放进作品集。
