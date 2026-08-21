fn main() {
    println!("cargo:rerun-if-env-changed=PET_SERVER_URL");
    tauri_build::build()
}
