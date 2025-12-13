# TinyPlayer 项目总结

## 项目简介
日系广播剧/Drama CD 播放器，具有温暖复古的昭和喫茶店美学风格。
纯原生实现 (Vanilla JS + HTML5 + CSS3)，无框架依赖。

## 文件结构
```
TinyPlayer/
├── index.html          # 主页面 (~339行)
├── js/app.js           # 核心逻辑 (~2,373行)
├── css/main.css        # 样式+主题 (~5,363行)
├── data/dramas.json    # 作品数据库
```

媒体文件托管在 Cloudflare R2，按作品分组：
```
tinyplayer-media/
├── tellmewhy/
│   ├── tellmewhy.webp    # 封面
│   ├── 01.mp3            # 音频
│   ├── 01 正義の味方.txt  # 字幕
│   └── ...
├── 神待ちイブくん/
│   ├── RJ01349154_img_main.webp
│   ├── 音轨1.mp3
│   ├── 音轨1.txt
│   └── ...
```

## 已实现功能
- [x] 多轨道音频播放 (播放/暂停/上下曲/快进快退)
- [x] SRT/WEBVTT 字幕支持 (中日双语显示，自动识别格式)
- [x] 双主题系统 (昭和喫茶店复古 / 樱花可爱风)
- [x] 高级筛选 (按社团/CV筛选，标签云可视化)
- [x] 搜索功能 (标题/社团/CV/标签，300ms防抖)
- [x] 排序功能 (新しい順/古い順/名前順/お気に入り順/最近再生順)
- [x] 播放历史记录 (Header下拉面板，最多5条，支持清除)
- [x] 评分系统 (5星评分，主题适配图标：咖啡杯/樱花)
- [x] 密码保护 (单作品加密，localStorage记住解锁状态)
- [x] 播放进度保存 (自动保存，支持继续收听)
- [x] 三级导航 (首页列表 → 作品详情页 → 独立播放界面)
- [x] 视图切换 (详情卡片视图 / 封面网格视图)
- [x] 响应式设计 (手机/平板/横屏适配)
- [x] 迷你播放器 (浏览时底部悬浮)
- [x] 键盘快捷键 (空格播放，方向键快进，ESC关闭)
- [x] 台本面板 (全字幕一览、搜索高亮、点击跳转、自动滚动)
- [x] 骨架屏加载 (Skeleton Loading，双主题适配)

## 数据结构 (dramas.json)
```json
{
  "dramas": [{
    "id": "unique-id",
    "productId": "RJ123456",
    "title": "作品名",
    "titleJp": "日文名",
    "circle": "社团名",
    "circleId": "circle-id",
    "cv": ["CV1", "CV2"],
    "cvIds": ["cv-id-1"],
    "cover": "作品文件夹/cover.webp",
    "releaseDate": "2024-01-01",
    "description": "简介",
    "tags": ["标签"],
    "password": null,
    "tracks": [{
      "id": 1,
      "title": "Track Title",
      "titleZh": "中文标题",
      "duration": "05:30",
      "audioFile": "作品文件夹/01.mp3",
      "subtitleFile": "作品文件夹/01.txt"
    }]
  }],
  "circles": {},
  "cvs": {}
}
```

## localStorage 键值
| 键 | 用途 |
|----|------|
| `dp_unlocked` | 已解锁的加密作品ID集合 |
| `dp_progress_[dramaId]_[trackId]` | 播放进度和时间戳 |
| `dp_subtitle_enabled` | 字幕开关状态 |
| `dp_theme` | 当前主题 (light/kawaii) |
| `dp_view` | 视图模式 (detail/cover) |
| `dp_sort` | 排序方式 (newest/oldest/name/rating/recent) |
| `dp_ratings` | 作品评分 JSON对象 {dramaId: 1-5} |
| `dp_history` | 播放历史记录 (最多5条) |

## 启动方式
```bash
cd TinyPlayer
python -m http.server 8080
# 访问 http://localhost:8080
```

## 可用插件
- `frontend-design`: 前端设计优化
- `feature-dev`: 功能开发辅助

## 待办/想法
- [ ] 收藏夹功能
- [ ] 离线播放 (Service Worker)
- [ ] 深色模式

## 部署配置
- [x] Cloudflare R2 存储集成 (音频/封面资源托管)
- [x] Cloudflare Access 认证层 (访问控制)

## 播放逻辑
- 播放进度自动保存，支持继续收听
- 自动播放下一轨（静默切换，不打开播放页面）
- 播完最后一轨后清空进度，下次从头开始

## 开发备注
- 响应式断点: 768px, 1024px
- iOS 安全区域已适配
- 本地开发: 设置 `useR2: false`，媒体文件放在 `media/` 文件夹
- 图片懒加载已启用
- 已禁止搜索引擎索引 (robots.txt + meta)
- 中文字体: 昭和风用 Noto Serif SC (宋体)，樱花风用 Noto Sans SC (黑体)

## 已修复的 Bug (2025-12-13)
- 跨作品切换播放时状态错乱 (新增 playingDramaId 追踪)
- 切换作品后进度恢复失败 (改用 loadedmetadata 事件)
- 历史面板封面在 R2 模式下不显示 (补充 getMediaUrl 调用)
- 切换轨道时台本面板内容不更新 (loadSubtitles 中重新渲染)
- 台本面板播放时不跟踪当前字幕 (新增 lastActiveSubtitleIndex 实现实时自动滚动)
- 樱花主题移动端Header图标被挤到第二行 (缩小按钮尺寸和间距)

---
最后更新: 2025-12-13
