# Desktop Pet

一个面向 Windows 和 macOS 的轻量桌面宠物。宠物使用透明置顶窗口，鼠标悬停后从 FastAPI 服务获取动态文案，并通过独立、鼠标穿透的气泡窗口显示。

English documentation: [README.en.md](README.en.md)

## 仓库结构

```text
apps/desktop/       Tauri 2 + TypeScript 桌面客户端
services/api/       FastAPI 动态互动服务
shared/contracts/   与语言无关的 API 契约
image/              原始宠物素材，目前运行时使用 image/0.png
docs/               架构与平台说明
deploy/             Docker Compose 与 Caddy 生产部署配置
```

## 本地开发

### 1. 安装桌面端依赖

```powershell
npm install
```

### 2. 启动 FastAPI

Windows PowerShell：

```powershell
python -m venv services/api/.venv
services/api/.venv/Scripts/python -m pip install -e "services/api[dev]"
services/api/.venv/Scripts/python -m uvicorn app.main:app --app-dir services/api --reload
```

macOS：

```bash
python3 -m venv services/api/.venv
services/api/.venv/bin/python -m pip install -e 'services/api[dev]'
services/api/.venv/bin/python -m uvicorn app.main:app --app-dir services/api --reload
```

服务默认监听 `http://127.0.0.1:8000`。修改 `services/api/app/data/messages.json` 后，下一次悬停会直接读取新文案，无需重启服务。

### 3. 启动桌面宠物

另开一个终端：

```powershell
npm run dev:desktop
```

短按宠物会立即请求并刷新一条新文案；悬停自动浮现逻辑仍然有效。按住约 220 毫秒或移动鼠标即可拖动宠物。托盘菜单可以显示、隐藏、重置位置或退出。

连续短按的默认静默时间为 1200 毫秒。需要调整时，将
`apps/desktop/.env.example` 复制为 `apps/desktop/.env`，修改：

```dotenv
VITE_MANUAL_CLICK_COOLDOWN_MS=1200
```

允许范围为 0～60000 毫秒，修改后需重新启动或构建桌面端。

## 配置远程后端

开发阶段默认使用本机 FastAPI。部署后，在启动客户端前设置：

```powershell
$env:PET_SERVER_URL = "https://example.com/api/v1/interactions"
npm run dev:desktop
```

正式环境应使用 HTTPS。客户端设置了短超时，后端不可用时会显示内置降级文案。

构建正式安装包时，`PET_SERVER_URL` 会被编译进桌面程序，最终用户无需设置环境变量；运行时同名变量仍可用于开发覆盖。云服务器的完整部署步骤见 [部署指南](docs/deployment.md)。

## 平台说明

- Windows：需要 WebView2 和用于 Rust Windows 构建的 Visual Studio C++ Build Tools。
- macOS：需要 Xcode Command Line Tools；请在真实 Mac 上完成签名、公证、透明窗口、多显示器和 Retina 验证。
- Tauri 的 macOS 透明窗口需要 `macOSPrivateApi`，不能用于 Mac App Store 上架；直接签名和公证分发不受这一商店规则限制。详见 [架构说明](docs/architecture.md)。

## 检查

```powershell
npm run check:frontend
npm run build:frontend
cargo check --manifest-path apps/desktop/src-tauri/Cargo.toml
services/api/.venv/Scripts/python -m pytest services/api/tests
```
