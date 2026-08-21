#[cfg(not(any(target_os = "windows", target_os = "macos")))]
mod fallback;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub use fallback::{configure_app, configure_window};
#[cfg(target_os = "macos")]
pub use macos::{configure_app, configure_window};
#[cfg(target_os = "windows")]
pub use windows::{configure_app, configure_window};
