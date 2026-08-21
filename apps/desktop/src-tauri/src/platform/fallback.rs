pub fn configure_app(_app: &mut tauri::App) -> tauri::Result<()> {
    Ok(())
}

pub fn configure_window(window: &tauri::WebviewWindow) -> tauri::Result<()> {
    window.set_always_on_top(true)?;
    Ok(())
}
