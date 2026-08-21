# Architecture / 架构说明

## Boundaries / 模块边界

```text
apps/desktop/src             Shared HTML/CSS/TypeScript UI
        │ invoke + events
apps/desktop/src-tauri       Native windows, tray, HTTP and platform adapters
        │ HTTPS JSON
services/api                 Dynamic interaction rules and copy
        │
shared/contracts             Language-neutral request/response contract
```

The desktop app owns presentation and resilience. The server owns message
selection and future personalization rules. If the server is offline, the pet
uses a local fallback instead of blocking the UI.

桌面端负责呈现、窗口行为和离线降级；服务端负责文案选择及后续个性化规则。服务端不可用时，宠物使用本地文案，不阻塞交互。

## Window model / 窗口模型

- `pet`: a tightly sized, transparent, draggable window that receives pointer events.
- `bubble`: an independent transparent window that ignores pointer events and follows the pet whenever it is shown.
- Windows-specific behavior lives in `src-tauri/src/platform/windows.rs`.
- macOS-specific behavior lives in `src-tauri/src/platform/macos.rs`.

Separating the windows prevents an invisible speech-bubble rectangle from
blocking clicks in applications below the pet.

拆分窗口可以避免气泡的透明矩形区域挡住下方应用的点击。

## Interaction lifecycle / 交互生命周期

```text
idle -> 300 ms dwell -> loading -> speaking -> cooldown -> idle
```

Only `pointerenter` creates a request. `pointermove` never calls the backend.
Late responses are discarded after the pointer leaves. The Rust HTTP client has
connection and total request timeouts.

只有有效悬停会发起请求；鼠标移动不会重复请求。鼠标离开后返回的迟到响应会被丢弃，Rust 网络层设置了连接和总超时。

## macOS distribution note / macOS 分发说明

Tauri currently requires its `macOSPrivateApi` option for transparent webview
windows. This supports direct signed and notarized distribution, but Tauri warns
that applications using this option cannot be accepted by the Mac App Store.
If App Store distribution becomes a requirement, reassess the shell before the
first public release, for example with an AppKit window shell and shared service
contracts.

Tauri 的透明 WebView 窗口目前需要启用 `macOSPrivateApi`。这不妨碍直接签名、公证和分发，但 Tauri 明确提示该选项会阻碍 Mac App Store 上架。如果以后必须上架 App Store，应在首次公开发布前重新评估窗口壳层，例如改用 AppKit 并继续复用服务端契约。

