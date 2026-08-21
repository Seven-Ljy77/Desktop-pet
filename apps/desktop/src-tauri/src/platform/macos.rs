pub fn configure_app(app: &mut tauri::App) -> tauri::Result<()> {
    app.set_activation_policy(tauri::ActivationPolicy::Accessory);
    Ok(())
}

pub fn configure_window(window: &tauri::WebviewWindow) -> tauri::Result<()> {
    window.set_always_on_top(true)?;
    Ok(())
}
