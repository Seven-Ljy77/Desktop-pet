use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager, PhysicalPosition};

// Anchor the bubble to the pet artwork's top-left corner. The bubble appears
// above-left of the pet; edge clamping below only prevents it leaving a screen.
const BUBBLE_OFFSET_X: i32 = -350;
const BUBBLE_OFFSET_Y: i32 = -100;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BubblePayload {
    pub message: String,
    pub emotion: String,
    pub animation: String,
    pub display_ms: u64,
}

pub fn place_pet(app: &tauri::AppHandle) -> Result<(), String> {
    let pet = app
        .get_webview_window("pet")
        .ok_or_else(|| "pet window is not available".to_string())?;
    let Some(monitor) = pet.primary_monitor().map_err(|error| error.to_string())? else {
        return Ok(());
    };

    let work_area = monitor.work_area();
    let monitor_position = work_area.position;
    let monitor_size = work_area.size;
    let pet_size = pet.outer_size().map_err(|error| error.to_string())?;
    let margin = (24.0 * monitor.scale_factor()).round() as i32;
    let x = monitor_position.x + monitor_size.width as i32 - pet_size.width as i32 - margin;
    let y = monitor_position.y + monitor_size.height as i32 - pet_size.height as i32 - margin;

    pet.set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

fn place_bubble(app: &tauri::AppHandle) -> Result<(), String> {
    let pet = app
        .get_webview_window("pet")
        .ok_or_else(|| "pet window is not available".to_string())?;
    let bubble = app
        .get_webview_window("bubble")
        .ok_or_else(|| "bubble window is not available".to_string())?;

    let pet_position = pet.outer_position().map_err(|error| error.to_string())?;
    let bubble_size = bubble.outer_size().map_err(|error| error.to_string())?;
    let monitor = pet.current_monitor().map_err(|error| error.to_string())?;

    let mut x = pet_position.x + BUBBLE_OFFSET_X;
    let mut y = pet_position.y + BUBBLE_OFFSET_Y;

    if let Some(monitor) = monitor {
        let work_area = monitor.work_area();
        let monitor_position = work_area.position;
        let monitor_size = work_area.size;
        let monitor_right = monitor_position.x + monitor_size.width as i32;
        let monitor_bottom = monitor_position.y + monitor_size.height as i32;

        x = x.clamp(
            monitor_position.x,
            monitor_right.saturating_sub(bubble_size.width as i32),
        );
        y = y.clamp(
            monitor_position.y,
            monitor_bottom.saturating_sub(bubble_size.height as i32),
        );
    }

    bubble
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())
}

pub fn show_bubble(app: &tauri::AppHandle, payload: BubblePayload) -> Result<(), String> {
    place_bubble(app)?;
    let bubble = app
        .get_webview_window("bubble")
        .ok_or_else(|| "bubble window is not available".to_string())?;
    bubble
        .emit("bubble-show", payload)
        .map_err(|error| error.to_string())?;
    bubble.show().map_err(|error| error.to_string())
}

pub fn hide_bubble(app: &tauri::AppHandle) -> Result<(), String> {
    let bubble = app
        .get_webview_window("bubble")
        .ok_or_else(|| "bubble window is not available".to_string())?;
    bubble.hide().map_err(|error| error.to_string())
}

pub fn start_pet_drag(app: &tauri::AppHandle) -> Result<(), String> {
    hide_bubble(app)?;
    let pet = app
        .get_webview_window("pet")
        .ok_or_else(|| "pet window is not available".to_string())?;
    pet.start_dragging().map_err(|error| error.to_string())
}
