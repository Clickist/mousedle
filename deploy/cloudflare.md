# Cloudflare 接入与上线清单

面向首次部署的操作手册。拓扑:

```text
玩家浏览器 ──HTTPS──> Cloudflare(免费版,橙云代理) ──HTTPS──> 服务器 nginx ──HTTP──> app-1 / app-2
                                                                        └─ 同机: PostgreSQL / Redis (compose)
```

为什么源站选硅谷:CF 免费版给中国大陆访客分配的边缘节点大多在美西(圣何塞),
源站在硅谷时 CF 回源只隔一跳,大陆玩家总延迟约 150ms 上下,是这个组合下最优的。
若源站放在首尔/东京,大陆流量会先绕到美西再折返亚洲,反而更慢。

## 1. 准备

- 一台海外 VPS(硅谷,2 GB 内存起步,Ubuntu 22.04/24.04 均可),能 SSH 登录。
- 一个域名(任意注册商,无需备案——服务器在海外)。
- 服务器上已按 `deploy/README.md` 部署 compose,并确认:
  `curl http://127.0.0.1:3000/api/health` 与 `:3001` 都正常。

## 2. 域名接入 Cloudflare

1. 注册 Cloudflare 账号,Add a site,选 **Free** 计划。
2. 到域名注册商处把 nameserver 改成 CF 分配的两个地址,等待生效(几分钟到几小时)。
3. DNS 页添加一条 A 记录:名称 `@`(或 `www` 等子域),值填服务器公网 IP,
   **代理状态保持橙色云(Proxied)**。

> 灰云(DNS only)意味着流量直连、暴露源站 IP、需要自己签 Let's Encrypt 证书。
> 只有追求大陆最低延迟时才考虑,本清单按橙云走。

## 3. TLS:Full (strict) + Origin CA 证书

1. CF 控制台 SSL/TLS → Overview,加密模式选 **Full (strict)**。
2. SSL/TLS → Origin Server → Create Certificate,参数默认(RSA,15 年有效)。
3. 把生成的证书与私钥分别存到服务器:

```bash
sudo mkdir -p /etc/nginx/certs
sudo editor /etc/nginx/certs/origin.pem   # 粘贴 Origin Certificate
sudo editor /etc/nginx/certs/origin.key   # 粘贴 Private Key
sudo chmod 600 /etc/nginx/certs/origin.key
```

注意:Origin CA 证书只被 Cloudflare 信任,浏览器不认,所以必须保持橙云代理。
再装 CF 建议的 Origin Rules 或使用默认即可,无需其他 TLS 配置。

4. SSL/TLS → Edge Certificates 里开启 **Always Use HTTPS**。

## 4. 安装 nginx 并套用配置

```bash
sudo apt update && sudo apt install -y nginx
sudo cp deploy/nginx.conf.example /etc/nginx/conf.d/mousedle.conf
sudo editor /etc/nginx/conf.d/mousedle.conf   # 改 server_name 为实际域名
sudo nginx -t && sudo systemctl reload nginx
```

该配置已处理好三件事,不要删:

- **真实 IP 还原**(real_ip + CF 网段):服务端限流按真实访客 IP 计算;
- **X-Forwarded-For 用还原后的 IP 重建**:客户端伪造 XFF 无法绕过限流;
- **`/assets/` 对 404 跨实例重试**:滚动更新期间新旧实例互缺 chunk 时由 nginx 兜底。

防火墙建议只放行 22/80/443;进阶做法是 80/443 仅对
`https://www.cloudflare.com/ips/` 的网段放行,强制流量必经 CF:

```bash
sudo ufw allow 22 && sudo ufw allow 80,443/tcp && sudo ufw enable
```

## 5. 应用侧检查(`deploy/.env.example` → `.env`)

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `JWT_SECRET` / `GUEST_ID_SALT` / `POSTGRES_PASSWORD` | ✅ | `openssl rand` 生成,三者独立 |
| `GEETEST_CAPTCHA_ID` / `GEETEST_PRIVATE_KEY` | ✅ | geetest.com 注册并创建验证应用,缺一容器起不来 |
| `CORS_ORIGINS` | ✅ | 精确公网 origin,如 `https://game.example.com`,末尾无斜杠 |
| `IMAGE` | 建议 | 固定 `ghcr.io/clickist/mousedle:latest` 或 `sha-xxxx` 标签 |
| `EMAIL_SMTP_*` | 可选 | 要开邮箱注册验证才需要 |

## 6. 验证清单

```bash
curl https://game.example.com/api/health          # 应返回 ok
```

浏览器再过一遍:

- 打开首页无混合内容警告(锁标正常);
- 注册/登录弹出极验验证码并能通过;
- 开一局单人猜题,确认实时交互正常(Socket.IO 走 wss,Network 面板应有 101);
- 管理后台上传一次选手 JSON(验证 client_max_body_size 放宽生效);
- `docker compose logs -f app-1` 里日志中的 IP 应是访客真实 IP 而非 CF 节点 IP。

## 7. 日常运维

- **更新**:`sudo ./update.sh`(滚动更新)。完成后到管理后台「资源版本」广播当前
  版本,在线客户端会弹刷新提示。
- **监控**:UptimeRobot(免费)加一条 HTTP(s) 监控指向 `https://域名/api/health`,
  5 分钟间隔,挂了发邮件。10 分钟配完,先用这个就够。
- **备份**:`deploy/backup.sh` 放到 compose.yaml 旁边,crontab 每日 4 点:

```cron
0 4 * * * /opt/csgofriberg/backup.sh >> /opt/csgofriberg/backups/backup.log 2>&1
```

  备份留在同盘只能防误删,务必再配 rclone/rsync 异地同步(脚本头部有示例)。
- **被攻击时**:CF 控制台一键开 Under Attack Mode;它只是给访客加一道
  5 秒质询,游戏本身不受影响,事后关闭即可(上游 csgofriberg 线上站实测就
  常驻 Managed Challenge,浏览器玩家不受影响,只有 curl/爬虫被拦)。
  注意开启期间 UptimeRobot 等外部拨测也会被质询挡住而误报宕机,属正常现象。

## 8. 常见问题

- **管理后台上传 JSON 报 413**:nginx `client_max_body_size` 被改回默认(配置里已放宽到 8m)。
- **所有人共用一个限流额度/IP**:real_ip 段被删,或 CF 发布了新网段没同步
  (核对 https://www.cloudflare.com/ips/)。
- **静态资源偶发 404**:滚动更新期间正常现象,`/assets/` 的重试规则会兜住;
  若关闭了该 location 就会出现用户白屏。
- **以后想换首尔机房 / 不走 CF 代理**:nginx 配置的 real_ip 只对 CF 网段生效,
  灰云直连时无需改;只需换发 Let's Encrypt 证书并替换 `ssl_certificate` 两个路径。
- **CF 缓存**:默认按扩展名缓存 `.js/.css`(带内容哈希,缓存无害),HTML 不缓存。
  排障时可临时开 Development Mode 绕过缓存。
