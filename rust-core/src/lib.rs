pub mod events;
pub mod pregen;

use wasm_bindgen::prelude::*;
use events::SortEvent;
use pregen::Algorithm;

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
    let events = pregen::pregen_sort(algo, &mut arr);

    // Return both events and sorted array
    let result = PregenResult {
        events,
        sorted_array: arr,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Result of a pregeneration sort, including events and final array.
#[derive(serde::Serialize)]
struct PregenResult {
    events: Vec<SortEvent>,
    sorted_array: Vec<i32>,
}

/// Get list of available algorithms.
#[wasm_bindgen]
pub fn get_available_algorithms() -> JsValue {
    let algorithms = vec!["bubble", "quicksort"];
    serde_wasm_bindgen::to_value(&algorithms).unwrap()
}
