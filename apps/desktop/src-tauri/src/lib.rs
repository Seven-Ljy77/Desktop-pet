mod interaction;
mod platform;
mod tray;
mod windows;

use std::sync::Mutex;
use tauri::{Emitter, Manager};

struct PetScaleState(Mutex<f64>);
struct PetRoleState(Mutex<String>);

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

#[tauri::command]
fn get_pet_scale(scale_state: tauri::State<PetScaleState>) -> Result<f64, String> {
    scale_state
        .0
        .lock()
        .map(|scale| *scale)
        .map_err(|_| "pet scale state is unavailable".to_string())
}

#[tauri::command]
fn set_pet_scale(
    app: tauri::AppHandle,
    scale_state: tauri::State<PetScaleState>,
    scale: f64,
) -> Result<f64, String> {
    let scale = windows::normalize_pet_scale(scale)?;
    windows::apply_pet_scale(&app, scale)?;
    windows::save_pet_scale(&app, scale)?;
    *scale_state
        .0
        .lock()
        .map_err(|_| "pet scale state is unavailable".to_string())? = scale;
    Ok(scale)
}

#[tauri::command]
fn get_pet_role(role_state: tauri::State<PetRoleState>) -> Result<String, String> {
    role_state
        .0
        .lock()
        .map(|role| role.clone())
        .map_err(|_| "pet role state is unavailable".to_string())
}

#[tauri::command]
fn set_pet_role(
    app: tauri::AppHandle,
    role_state: tauri::State<PetRoleState>,
    role: String,
) -> Result<String, String> {
    let role = windows::normalize_pet_role(&role)?.to_string();
    windows::save_pet_role(&app, &role)?;
    *role_state
        .0
        .lock()
        .map_err(|_| "pet role state is unavailable".to_string())? = role.clone();
    app.emit("pet-role-changed", &role)
        .map_err(|error| error.to_string())?;
    Ok(role)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            platform::configure_app(app)?;
            let pet_scale = windows::load_pet_scale(app.handle());
            let pet_role = windows::load_pet_role(app.handle());
            app.manage(PetScaleState(Mutex::new(pet_scale)));
            app.manage(PetRoleState(Mutex::new(pet_role)));

            for label in ["pet", "bubble"] {
                if let Some(window) = app.get_webview_window(label) {
                    platform::configure_window(&window)?;
                }
            }

            if let Some(bubble) = app.get_webview_window("bubble") {
                bubble.set_ignore_cursor_events(true)?;
            }

            if let Some(settings) = app.get_webview_window("settings") {
                let settings_window = settings.clone();
                settings.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = settings_window.hide();
                    }
                });
            }

            windows::apply_pet_scale(app.handle(), pet_scale).map_err(std::io::Error::other)?;
            windows::place_pet(app.handle()).map_err(std::io::Error::other)?;
            tray::create(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            request_interaction,
            show_bubble,
            hide_bubble,
            start_pet_drag,
            get_pet_scale,
            set_pet_scale,
            get_pet_role,
            set_pet_role
        ])
        .run(tauri::generate_context!())
        .expect("error while running Desktop Pet");
}
