pub mod events;
pub mod live;
pub mod pregen;

use events::SortEvent;
use pregen::Algorithm;
use wasm_bindgen::prelude::*;

/// Initialize panic hook for better error messages in browser console
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

/// Run a pregeneration sort on the given array.
///
/// # Arguments
/// * `algorithm` - Name of the sorting algorithm ("bubble", "quicksort")
/// * `array` - JavaScript array of numbers to sort
///
/// # Returns
/// Array of SortEvents describing all operations performed
#[wasm_bindgen]
pub fn pregen_sort(algorithm: &str, array: JsValue) -> Result<JsValue, JsValue> {
    // Parse algorithm name
    let algo = Algorithm::from_str(algorithm)
        .ok_or_else(|| JsValue::from_str(&format!("Unknown algorithm: {}", algorithm)))?;

    // Convert JS array to Rust Vec
    let mut arr: Vec<i32> = events::js_to_array(array)?;
    algo.validate_array_size(arr.len())
        .map_err(|message| JsValue::from_str(&message))?;

    // Run the sort
    let events = pregen::pregen_sort(algo, &mut arr);

    // Convert events to JS
    events::events_to_js(&events)
}

/// Get the sorted array after running pregen_sort.
/// This is a convenience function to also get the final sorted result.
#[wasm_bindgen]
pub fn pregen_sort_with_result(algorithm: &str, array: JsValue) -> Result<JsValue, JsValue> {
    let algo = Algorithm::from_str(algorithm)
        .ok_or_else(|| JsValue::from_str(&format!("Unknown algorithm: {}", algorithm)))?;

    let mut arr: Vec<i32> = events::js_to_array(array)?;
    algo.validate_array_size(arr.len())
        .map_err(|message| JsValue::from_str(&message))?;
    let events = pregen::pregen_sort(algo, &mut arr);

    // Return both events and sorted array
    let result = PregenResult {
        events,
        sorted_array: arr,
    };

    serde::Serialize::serialize(
        &result,
        &serde_wasm_bindgen::Serializer::new().serialize_missing_as_null(true),
    )
    .map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Result of a pregeneration sort, including events and final array.
#[derive(serde::Serialize)]
struct PregenResult {
    events: Vec<SortEvent>,
    sorted_array: Vec<i32>,
}

/// Generation metadata for a pregeneration algorithm.
#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct PregenAlgorithmMetadata {
    id: &'static str,
    max_array_size: Option<usize>,
}

/// Algorithm capabilities used to configure generation controls.
#[wasm_bindgen]
pub fn get_pregen_algorithm_metadata() -> JsValue {
    let metadata: Vec<_> = Algorithm::all()
        .iter()
        .map(|algorithm| PregenAlgorithmMetadata {
            id: algorithm.as_str(),
            max_array_size: algorithm.max_array_size(),
        })
        .collect();
    serde::Serialize::serialize(
        &metadata,
        &serde_wasm_bindgen::Serializer::new().serialize_missing_as_null(true),
    )
    .unwrap()
}

/// Get list of available algorithms.
#[wasm_bindgen]
pub fn get_available_algorithms() -> JsValue {
    let algorithms = Algorithm::all()
        .iter()
        .map(Algorithm::as_str)
        .collect::<Vec<_>>();
    serde_wasm_bindgen::to_value(&algorithms).unwrap()
}
