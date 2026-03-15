# NoDelay

NoDelay 是一个基于桌面端的轻量记录系统，面向“按天记录事项”的使用场景，支持主题与标签管理、月历浏览与本地数据持久化。

## 技术栈

- 前端：React 19 + TypeScript + Vite
- UI：Ant Design 6
- 状态管理：Zustand
- 富文本编辑：Tiptap
- 桌面容器：Tauri 2（Rust）
- 本地数据库：SQLite（`@tauri-apps/plugin-sql`）

## 项目功能

- 月视图查看与按日期新增/编辑/删除事项
- 主题/标签统一管理
- 本地数据存储，无需联网

## 本地开发

```bash
npm install
npm run tauri dev
```

## 构建

```bash
npm run build
npm run tauri build
```
