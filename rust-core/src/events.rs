use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

/// Semantic events emitted by sorting algorithms.
/// These events describe *what* happened, not *how* to render it.
/// Events support the Inverse Command Pattern for rewinding.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SortEvent {
    /// Two elements were swapped. Self-inverse: Swap(a,b) undone by Swap(a,b).
    Swap { i: usize, j: usize },

    /// An element was overwritten. Stores old value for invertibility.
    Overwrite {
        idx: usize,
        old_val: i32,
        new_val: i32,
    },

    /// Two elements were compared (no mutation).
    Compare { i: usize, j: usize },

    /// Entering a subarray range (e.g., quicksort partition, mergesort merge).
    EnterRange { lo: usize, hi: usize },

    /// Exiting the current subarray range. Stores lo/hi for invertibility.
    ExitRange { lo: usize, hi: usize },

    /// Sorting is complete.
    Done,
}

impl SortEvent {
    /// Returns the inverse of this event for rewinding.
    /// Stateless events (Compare, Done) return themselves.
    /// EnterRange and ExitRange are inverses of each other.
    pub fn inverse(&self) -> SortEvent {
        match self {
            // Swap is self-inverse
            SortEvent::Swap { i, j } => SortEvent::Swap { i: *i, j: *j },

            // Overwrite inverse swaps old and new values
            SortEvent::Overwrite { idx, old_val, new_val } => SortEvent::Overwrite {
                idx: *idx,
                old_val: *new_val,
                new_val: *old_val,
            },

            // EnterRange and ExitRange are inverses of each other
            SortEvent::EnterRange { lo, hi } => SortEvent::ExitRange { lo: *lo, hi: *hi },
            SortEvent::ExitRange { lo, hi } => SortEvent::EnterRange { lo: *lo, hi: *hi },

            // Stateless events are their own inverse
            other => other.clone(),
        }
    }

    /// Returns true if this event mutates the array.
    pub fn is_mutation(&self) -> bool {
        matches!(self, SortEvent::Swap { .. } | SortEvent::Overwrite { .. })
    }
}

/// Convert a vector of SortEvents to a JsValue for passing to JavaScript.
pub fn events_to_js(events: &[SortEvent]) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(events).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// Convert a JsValue array back to Vec<i32> (for receiving arrays from JS).
pub fn js_to_array(js_array: JsValue) -> Result<Vec<i32>, JsValue> {
    serde_wasm_bindgen::from_value(js_array).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_swap_inverse() {
        let event = SortEvent::Swap { i: 0, j: 5 };
        assert_eq!(event.inverse(), SortEvent::Swap { i: 0, j: 5 });
    }

    #[test]
    fn test_overwrite_inverse() {
        let event = SortEvent::Overwrite {
            idx: 3,
            old_val: 10,
            new_val: 20,
        };
        let inverse = event.inverse();
        assert_eq!(
            inverse,
            SortEvent::Overwrite {
                idx: 3,
                old_val: 20,
                new_val: 10,
            }
        );
    }

    #[test]
    fn test_range_events_inverse() {
        let enter = SortEvent::EnterRange { lo: 5, hi: 15 };
        let exit = SortEvent::ExitRange { lo: 5, hi: 15 };

        // EnterRange inverse is ExitRange with same bounds
        assert_eq!(enter.inverse(), SortEvent::ExitRange { lo: 5, hi: 15 });

        // ExitRange inverse is EnterRange with same bounds
        assert_eq!(exit.inverse(), SortEvent::EnterRange { lo: 5, hi: 15 });

        // Double inverse returns to original
        assert_eq!(enter.inverse().inverse(), enter);
        assert_eq!(exit.inverse().inverse(), exit);
    }

    #[test]
    fn test_is_mutation() {
        assert!(SortEvent::Swap { i: 0, j: 1 }.is_mutation());
        assert!(SortEvent::Overwrite {
            idx: 0,
            old_val: 1,
            new_val: 2
        }
        .is_mutation());
        assert!(!SortEvent::Compare { i: 0, j: 1 }.is_mutation());
        assert!(!SortEvent::EnterRange { lo: 0, hi: 10 }.is_mutation());
        assert!(!SortEvent::ExitRange { lo: 0, hi: 10 }.is_mutation());
        assert!(!SortEvent::Done.is_mutation());
    }
}
