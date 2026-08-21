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

### 更换角色图片素材

当前运行时使用的角色图片是：

```text
image/0.png
```

开发时可以直接用新的透明 PNG 覆盖这个文件，不需要修改代码。运行
`npm run dev:desktop` 时，Vite 会监测素材变化并进行热更新；如果没有立即
刷新，可以保存图片后等待几秒，或重启开发命令。

图片的显示宽度由 `apps/desktop/src/styles.css` 中的 `.pet-image` 控制：

```css
.pet-image {
  width: 354px;
}
```

如果改用其他文件名，需要同步修改 `apps/desktop/src/main.ts` 中的图片导入：

```ts
import petImageUrl from "@pet-image/pet-new.png";
```

图片属于桌面端资源，替换图片不需要修改 FastAPI 或云服务器。已经生成的
`.exe`、`.app` 或 `.dmg` 不会自动更新素材；更换后需要重新构建并安装桌面端。

## 配置远程后端

开发阶段默认使用本机 `http://127.0.0.1:8000` 上的 FastAPI。要让桌面宠物连接 Ubuntu 云服务器，无需在本地启动 FastAPI，也无需修改代码，只需在启动桌面端的终端中设置 `PET_SERVER_URL`。

### Windows 配置远程后端

在 Windows PowerShell 中进入项目目录：

```powershell
cd D:\programming\desktop-pet
```

备案等待期间，临时指定公网 IP 上的 HTTP 接口：

```powershell
$env:PET_SERVER_URL = "http://139.196.46.8/api/v1/interactions"
```

确认当前 PowerShell 已设置成功：

```powershell
$env:PET_SERVER_URL
```

必须在同一个 PowerShell 窗口中启动桌面宠物，否则新进程可能读取不到这个临时环境变量：

```powershell
npm run dev:desktop
```

结束测试后，可以清除当前 PowerShell 会话中的临时地址：

```powershell
Remove-Item Env:PET_SERVER_URL
```

备案、DNS 和 HTTPS 生效后，Windows 使用正式地址启动：

```powershell
$env:PET_SERVER_URL = "https://api.desktop-pet.cn/api/v1/interactions"
npm run dev:desktop
```

### macOS 配置远程后端

在 macOS Terminal 中进入克隆后的项目目录，实际路径按自己的保存位置调整：

```bash
cd ~/path/to/Desktop-pet
```

备案等待期间，临时指定公网 IP 上的 HTTP 接口：

```bash
export PET_SERVER_URL="http://139.196.46.8/api/v1/interactions"
```

确认当前终端已设置成功：

```bash
echo "$PET_SERVER_URL"
```

必须在同一个 Terminal 窗口中启动桌面宠物：

```bash
npm run dev:desktop
```

结束测试后，可以清除当前终端会话中的临时地址：

```bash
unset PET_SERVER_URL
```

备案、DNS 和 HTTPS 生效后，macOS 使用正式地址启动：

```bash
export PET_SERVER_URL="https://api.desktop-pet.cn/api/v1/interactions"
npm run dev:desktop
```

### 确认请求到达云服务器

Windows 或 macOS 完成上述配置后，短按或悬停宠物都会请求 Ubuntu 后端。可以通过 SSH 登录服务器并实时查看 API 日志：

```bash
cd /opt/Desktop-pet
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f --tail=100 api
```

交互时应看到 `POST /api/v1/interactions` 和 `200 OK`。按 `Ctrl+C` 只会退出日志查看，不会停止服务器容器。

`apps/desktop/.env` 当前只用于 `VITE_MANUAL_CLICK_COOLDOWN_MS` 等前端构建配置，Rust 网络层不会自动从该文件读取 `PET_SERVER_URL`。

正式环境应使用 HTTPS。客户端设置了短超时，后端不可用时会显示内置降级文案。当前公网 IP + HTTP 地址仅用于备案期间的开发联调，不应编译进公开发布版本。

构建正式安装包时，`PET_SERVER_URL` 会被编译进桌面程序，最终用户无需设置环境变量；运行时同名变量仍可用于开发覆盖。云服务器的完整部署步骤见 [部署指南](docs/deployment.md)。

## 云服务器 Docker 日常操作

当前云服务器上的项目目录为：

```text
/opt/Desktop-pet
```

下面的命令均在 SSH 登录 Ubuntu 服务器后执行。先进入项目目录：

```bash
cd /opt/Desktop-pet
```

部署由两个容器组成：

- `api`：运行 FastAPI，容器内部端口为 `8000`，不直接暴露到公网。
- `caddy`：监听公网 `80/443`，把请求转发给 `api`，正式使用域名后还负责自动申请和续期 HTTPS 证书。

### 查看运行状态

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
```

正常情况下，`api` 应显示 `healthy`，`caddy` 应显示 `Up`。也可以查看服务器上运行的所有容器：

```bash
docker ps
```

### 查看日志

查看最近 100 行日志：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=100
```

持续跟踪日志：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f --tail=100
```

按 `Ctrl+C` 只会退出日志查看，不会停止容器。只查看某个服务时，在命令末尾加上服务名：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f --tail=100 api
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f --tail=100 caddy
```

### 启动、停止与重启

启动已有容器：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d
```

`-d` 表示后台运行，因此退出 SSH 后服务仍会继续运行。

重启所有服务：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml restart
```

只重启 API：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml restart api

# 重新挂载 + 健康检查
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --force-recreate api
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
```

停止但保留容器：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml stop
```

重新启动已停止的容器：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml start
```

停止并删除容器和 Compose 网络：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml down
```

普通的 `down` 不会删除保存 Caddy HTTPS 证书的命名卷。不要随意添加 `-v`，否则会连同这些数据卷一起删除。

两个服务都配置了 `restart: unless-stopped`。服务器或 Docker 重启后，容器通常会自动恢复；如果曾手动执行 `stop`，则需要再次执行 `start` 或 `up -d`。

### 拉取代码并重新部署

先确认服务器工作区没有临时修改：

```bash
git status
```

从 GitHub 获取最新提交：

```bash
git pull --ff-only
```

重新构建镜像并应用配置：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build
```

Compose 只会重建发生变化的部分。完成后再次运行 `ps` 和健康检查，不要只根据构建命令退出码判断上线成功。

### 检查接口

当前备案等待期间，可通过公网 IP 检查：

```bash
curl http://139.196.46.8/health
```

预期返回：

```json
{"status":"ok"}
```

测试互动接口：

```bash
curl -X POST http://139.196.46.8/api/v1/interactions \
  -H "Content-Type: application/json" \
  -d '{"event":"manual_click","pet_id":"default","client_id":"cloud-test","locale":"zh-CN","app_version":"0.1.0"}'
```

备案、DNS 和 HTTPS 完成后，健康检查地址改为：

```bash
curl https://api.desktop-pet.cn/health
```

### 修改动态文案

文案文件从宿主机只读挂载到容器中，服务端每次请求都会重新读取，因此修改后不需要重启：

```bash
nano services/api/app/data/messages.json
```

保存后可以让正在运行的 API 容器检查 JSON 格式：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml exec -T api \
  python -m json.tool /app/app/data/messages.json > /dev/null
```

命令没有输出且退出码为 `0` 表示 JSON 格式有效。可以通过下面的命令查看退出码：

```bash
echo $?
```

修改前建议备份：

```bash
cp services/api/app/data/messages.json /root/desktop-pet-messages.json.bak
```

### 修改部署地址

查看当前配置：

```bash
cat deploy/.env
```

编辑配置：

```bash
nano deploy/.env
```

公网 IP 临时测试配置：

```dotenv
PET_DOMAIN=http://139.196.46.8
```

备案和 DNS 解析完成后的正式配置：

```dotenv
PET_DOMAIN=api.desktop-pet.cn
```

修改后应用配置：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d
```

### 查看资源与清理旧镜像

查看容器资源占用：

```bash
docker stats --no-stream
```

查看 Docker 磁盘占用：

```bash
docker system df
```

只清理没有被任何容器使用的悬空镜像：

```bash
docker image prune
```

执行前阅读 Docker 给出的删除列表并确认。不要在不了解影响时使用 `docker system prune -a --volumes`。

### 常用故障排查

检查 Compose 配置是否能正常展开：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml config
```

查看 API 健康检查详情：

```bash
docker inspect --format='{{json .State.Health}}' desktop-pet-api-1
```

检查服务器端口监听：

```bash
ss -lntp | grep -E ':80|:443'
```

检查 Docker 服务：

```bash
systemctl status docker
```

进入 API 容器进行只读排查：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml exec api sh
```

输入 `exit` 离开容器。生产配置将容器文件系统设为只读，因此不要在容器内直接修改程序；代码和文案应在宿主机仓库中维护，再通过 Compose 更新。

安全组应继续只向公网开放 Web 所需的 `80/443`；SSH `22` 仅允许可信公网 IP，FastAPI 的 `8000` 不应对公网开放。

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
