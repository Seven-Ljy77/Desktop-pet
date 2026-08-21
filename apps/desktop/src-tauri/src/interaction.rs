use serde::{Deserialize, Serialize};
use std::time::Duration;

const DEFAULT_INTERACTION_URL: &str = "http://127.0.0.1:8000/api/v1/interactions";
const BUILD_TIME_INTERACTION_URL: Option<&str> = option_env!("PET_SERVER_URL");

#[derive(Debug, Serialize, Deserialize)]
pub struct InteractionRequest {
    pub event: String,
    pub pet_id: String,
    pub client_id: String,
    pub locale: String,
    pub app_version: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct InteractionResponse {
    pub message: String,
    pub emotion: String,
    pub animation: String,
    pub display_ms: u64,
    pub cooldown_ms: u64,
    pub request_id: String,
}

pub async fn fetch_interaction(payload: InteractionRequest) -> Result<InteractionResponse, String> {
    let endpoint = std::env::var("PET_SERVER_URL")
        .ok()
        .filter(|value| !value.trim().is_empty())
        .or_else(|| BUILD_TIME_INTERACTION_URL.map(str::to_owned))
        .unwrap_or_else(|| DEFAULT_INTERACTION_URL.to_string());
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_millis(1_200))
        .timeout(Duration::from_millis(2_500))
        .build()
        .map_err(|error| format!("failed to create HTTP client: {error}"))?;

    let response = client
        .post(endpoint)
        .json(&payload)
        .send()
        .await
        .map_err(|error| format!("interaction request failed: {error}"))?
        .error_for_status()
        .map_err(|error| format!("interaction server returned an error: {error}"))?;

    response
        .json::<InteractionResponse>()
        .await
        .map_err(|error| format!("invalid interaction response: {error}"))
}
