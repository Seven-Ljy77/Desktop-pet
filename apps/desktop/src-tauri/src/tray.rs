use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager,
};

pub fn create(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "显示宠物", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "隐藏宠物", true, None::<&str>)?;
    let reset = MenuItem::with_id(app, "reset", "重置位置", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &reset, &separator, &quit])?;

    let mut builder = TrayIconBuilder::with_id("desktop-pet")
        .tooltip("Desktop Pet")
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("pet") {
                    let _ = window.show();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("bubble") {
                    let _ = window.hide();
                }
                if let Some(window) = app.get_webview_window("pet") {
                    let _ = window.hide();
                }
            }
            "reset" => {
                let _ = crate::windows::place_pet(app);
            }
            "quit" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}
