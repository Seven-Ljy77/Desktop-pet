# 云服务器部署

这套部署只运行 Desktop Pet 的 FastAPI 后端。Windows 和 macOS 桌面客户端仍在用户电脑上运行，通过 HTTPS 请求服务器。

## 服务器要求

- 一台带公网 IPv4 的 Linux 云服务器（入门规格即可）
- 一个已解析到服务器公网 IP 的域名，例如 `pet-api.example.com`
- 防火墙或安全组放行 TCP `80`、TCP `443` 和 UDP `443`
- 已安装 Docker Engine 和 Docker Compose v2

不需要对公网开放 `8000` 端口。FastAPI 只在 Docker 内部网络中由 Caddy 访问。

## 首次部署

将仓库克隆到服务器后，在仓库根目录执行：

```bash
cp deploy/.env.example deploy/.env
```

修改 `deploy/.env`：

```dotenv
PET_DOMAIN=pet-api.example.com
```

确认域名已经解析到服务器，然后构建并启动：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build
```

Caddy 会自动申请并续期 HTTPS 证书。检查服务：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml ps
docker compose --env-file deploy/.env -f deploy/compose.yaml logs --tail=100
curl https://pet-api.example.com/health
```

预期健康检查返回：

```json
{"status":"ok"}
```

## 更新文案

服务端每次请求都会重新读取：

```text
services/api/app/data/messages.json
```

在服务器上修改这个文件后无需重启容器。修改前建议先备份，并确保文件仍然是有效 JSON。

## 更新程序

拉取新版本后执行：

```bash
docker compose --env-file deploy/.env -f deploy/compose.yaml up -d --build
docker image prune -f
```

`docker image prune` 只清理未被使用的镜像；如果不希望自动清理，可以省略第二条命令。

## 构建连接生产服务器的桌面端

构建安装包前设置完整接口地址。该地址会被编译进桌面程序：

Windows PowerShell：

```powershell
$env:PET_SERVER_URL = "https://pet-api.example.com/api/v1/interactions"
npm run build:desktop
```

macOS/Linux shell：

```bash
PET_SERVER_URL="https://pet-api.example.com/api/v1/interactions" npm run build:desktop
```

开发或排查问题时，启动程序前设置的同名运行时环境变量仍可覆盖构建地址。

## 运维命令

```bash
# 查看状态
docker compose --env-file deploy/.env -f deploy/compose.yaml ps

# 跟踪日志
docker compose --env-file deploy/.env -f deploy/compose.yaml logs -f --tail=100

# 重启
docker compose --env-file deploy/.env -f deploy/compose.yaml restart

# 停止（保留 HTTPS 证书数据）
docker compose --env-file deploy/.env -f deploy/compose.yaml down
```

当前后端使用进程内存记录同一客户端最近一次文案，因此生产配置固定使用一个 Uvicorn worker。未来扩展为多个实例时，应把这部分状态迁移到 Redis 或数据库。
