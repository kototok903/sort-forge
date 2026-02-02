//! V2 Engine: Live stepping sorting algorithms.
//!
//! State machine implementations that execute incrementally,
//! suitable for large arrays where pregeneration would use too much memory.

pub mod bubble_sort;
pub mod quicksort_ll;

use wasm_bindgen::prelude::*;
use crate::events::SortEvent;

pub use bubble_sort::BubbleSortStepper;
pub use quicksort_ll::QuickSortLLStepper;

/// Trait for live stepping sorting algorithms.
pub trait Stepper {
    /// Execute up to `limit` steps, return events generated.
    fn step(&mut self, arr: &mut [i32], limit: usize) -> Vec<SortEvent>;

    /// Check if sort is complete.
    fn is_done(&self) -> bool;
}

/// Internal enum to hold concrete stepper types.
enum StepperKind {
    Bubble(BubbleSortStepper),
    QuickSortLL(QuickSortLLStepper),
}

/// Wasm-exposed live stepper wrapper.
#[wasm_bindgen]
pub struct LiveStepper {
    inner: StepperKind,
    arr: Vec<i32>,
}

#[wasm_bindgen]
impl LiveStepper {
    /// Create a new live stepper for the given algorithm and array.
    #[wasm_bindgen(constructor)]
    pub fn new(algorithm: &str, array: JsValue) -> Result<LiveStepper, JsValue> {
        let arr: Vec<i32> = serde_wasm_bindgen::from_value(array)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;

        let inner = match algorithm.to_lowercase().as_str() {
            "bubble" | "bubblesort" | "bubble_sort" => {
                StepperKind::Bubble(BubbleSortStepper::new(arr.len()))
            }
            "quicksort_ll" | "quicksortll" | "quick_sort_ll" => {
                StepperKind::QuickSortLL(QuickSortLLStepper::new(arr.len()))
            }
            _ => return Err(JsValue::from_str(&format!("Unknown live algorithm: {}", algorithm))),
        };

        Ok(LiveStepper { inner, arr })
    }

    /// Execute up to `limit` steps, return events generated.
    pub fn step(&mut self, limit: usize) -> Result<JsValue, JsValue> {
        let events = match &mut self.inner {
            StepperKind::Bubble(s) => s.step(&mut self.arr, limit),
            StepperKind::QuickSortLL(s) => s.step(&mut self.arr, limit),
        };

        serde_wasm_bindgen::to_value(&events)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }

    /// Check if sort is complete.
    pub fn is_done(&self) -> bool {
        match &self.inner {
            StepperKind::Bubble(s) => s.is_done(),
            StepperKind::QuickSortLL(s) => s.is_done(),
        }
    }

    /// Get current array state.
    pub fn get_array(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.arr)
            .map_err(|e| JsValue::from_str(&e.to_string()))
    }
}

/// Get list of available live algorithms.
#[wasm_bindgen]
pub fn get_live_algorithms() -> JsValue {
    let algorithms = vec!["bubble", "quicksort_ll"];
    serde_wasm_bindgen::to_value(&algorithms).unwrap()
}
