mod interaction;
mod platform;
mod tray;
mod windows;

use tauri::Manager;

#[tauri::command]
async fn request_interaction(
    payload: interaction::InteractionRequest,
) -> Result<interaction::InteractionResponse, String> {
    interaction::fetch_interaction(payload).await
}

#[tauri::command]
fn show_bubble(app: tauri::AppHandle, payload: windows::BubblePayload) -> Result<(), String> {
    windows::show_bubble(&app, payload)
}

#[tauri::command]
fn hide_bubble(app: tauri::AppHandle) -> Result<(), String> {
    windows::hide_bubble(&app)
}

#[tauri::command]
fn start_pet_drag(app: tauri::AppHandle) -> Result<(), String> {
    windows::start_pet_drag(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            platform::configure_app(app)?;

            for label in ["pet", "bubble"] {
                if let Some(window) = app.get_webview_window(label) {
                    platform::configure_window(&window)?;
                }
            }

            if let Some(bubble) = app.get_webview_window("bubble") {
                bubble.set_ignore_cursor_events(true)?;
            }

            windows::place_pet(app.handle()).map_err(std::io::Error::other)?;
            tray::create(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            request_interaction,
            show_bubble,
            hide_bubble,
            start_pet_drag
        ])
        .run(tauri::generate_context!())
        .expect("error while running Desktop Pet");
}
