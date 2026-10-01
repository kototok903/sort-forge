use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

pub type ArrayId = usize;
pub type ElementValue = Option<i32>;
pub const MAIN_ARRAY_ID: ArrayId = 0;

/// A position in an identified array, independent of the value stored there.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ElementRef {
    pub arr_id: ArrayId,
    pub idx: usize,
}

impl ElementRef {
    pub const fn main(idx: usize) -> Self {
        Self {
            arr_id: MAIN_ARRAY_ID,
            idx,
        }
    }
}

/// Semantic operations shared by pregeneration and Live engines.
/// Nullable values represent empty slots; zero remains a numeric value.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SortEvent {
    /// Atomic exchange, including between different arrays.
    Swap {
        i: ElementRef,
        j: ElementRef,
    },
    /// Assignment without tracked source.
    Overwrite {
        dest: ElementRef,
        old_val: ElementValue,
        new_val: ElementValue,
    },
    /// Assignment with tracked source.
    Copy {
        src: ElementRef,
        dest: ElementRef,
        old_val: ElementValue,
        new_val: ElementValue,
    },
    Compare {
        i: ElementRef,
        j: ElementRef,
    },
    EnterRange {
        #[serde(rename = "arrId")]
        arr_id: ArrayId,
        lo: usize,
        hi: usize,
    },
    ExitRange {
        #[serde(rename = "arrId")]
        arr_id: ArrayId,
        lo: usize,
        hi: usize,
    },
    /// Every added array has a unique ID.
    AddArray {
        #[serde(rename = "arrId")]
        arr_id: ArrayId,
        values: Vec<ElementValue>,
    },
    RemoveArray {
        #[serde(rename = "arrId")]
        arr_id: ArrayId,
    },
    Done,
}

impl SortEvent {
    /// Inverse when it can be expressed without retained workspace state.
    /// Lifecycle events require directional application to a workspace instead.
    /// Copy undo restores only the destination; it never copies into the source.
    pub fn inverse(&self) -> Option<SortEvent> {
        Some(match self {
            SortEvent::Overwrite {
                dest,
                old_val,
                new_val,
            } => SortEvent::Overwrite {
                dest: *dest,
                old_val: *new_val,
                new_val: *old_val,
            },
            SortEvent::Copy {
                dest,
                old_val,
                new_val,
                ..
            } => SortEvent::Overwrite {
                dest: *dest,
                old_val: *new_val,
                new_val: *old_val,
            },
            SortEvent::EnterRange { arr_id, lo, hi } => SortEvent::ExitRange {
                arr_id: *arr_id,
                lo: *lo,
                hi: *hi,
            },
            SortEvent::ExitRange { arr_id, lo, hi } => SortEvent::EnterRange {
                arr_id: *arr_id,
                lo: *lo,
                hi: *hi,
            },
            SortEvent::AddArray { .. } | SortEvent::RemoveArray { .. } => return None,
            other => other.clone(),
        })
    }

    /// Whether the event changes element values or array membership.
    pub fn is_mutation(&self) -> bool {
        match self {
            SortEvent::Swap { .. }
            | SortEvent::Overwrite { .. }
            | SortEvent::Copy { .. }
            | SortEvent::AddArray { .. }
            | SortEvent::RemoveArray { .. } => true,
            SortEvent::Compare { .. }
            | SortEvent::EnterRange { .. }
            | SortEvent::ExitRange { .. }
            | SortEvent::Done => false,
        }
    }
}

/// Serialize empty slots as JavaScript null (not undefined), matching ElementValue.
pub fn events_to_js(events: &[SortEvent]) -> Result<JsValue, JsValue> {
    events
        .serialize(&serde_wasm_bindgen::Serializer::new().serialize_missing_as_null(true))
        .map_err(|e| JsValue::from_str(&e.to_string()))
}

pub fn js_to_array(js_array: JsValue) -> Result<Vec<i32>, JsValue> {
    serde_wasm_bindgen::from_value(js_array).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inverses_preserve_array_identity_and_empty_values() {
        let target = ElementRef { arr_id: 2, idx: 3 };
        let overwrite = SortEvent::Overwrite {
            dest: target,
            old_val: None,
            new_val: Some(0),
        };
        assert_eq!(
            overwrite.inverse(),
            Some(SortEvent::Overwrite {
                dest: target,
                old_val: Some(0),
                new_val: None,
            })
        );
        assert_eq!(overwrite.inverse().unwrap().inverse(), Some(overwrite));

        let swap = SortEvent::Swap {
            i: ElementRef::main(0),
            j: target,
        };
        assert_eq!(swap.inverse(), Some(swap.clone()));

        let enter = SortEvent::EnterRange {
            arr_id: 2,
            lo: 5,
            hi: 15,
        };
        let exit = SortEvent::ExitRange {
            arr_id: 2,
            lo: 5,
            hi: 15,
        };
        assert_eq!(enter.inverse(), Some(exit.clone()));
        assert_eq!(exit.inverse(), Some(enter));
    }

    #[test]
    fn copy_inverse_restores_destination_without_touching_source() {
        let dest = ElementRef::main(1);
        let copy = SortEvent::Copy {
            src: ElementRef { arr_id: 1, idx: 4 },
            dest,
            old_val: Some(9),
            new_val: Some(3),
        };
        assert_eq!(
            copy.inverse(),
            Some(SortEvent::Overwrite {
                dest: dest,
                old_val: Some(3),
                new_val: Some(9),
            })
        );
    }

    #[test]
    fn lifecycle_inverses_require_workspace_history() {
        assert_eq!(
            SortEvent::AddArray {
                arr_id: 1,
                values: vec![None, Some(0)]
            }
            .inverse(),
            None
        );
        assert_eq!(SortEvent::RemoveArray { arr_id: 1 }.inverse(), None);
    }

    #[test]
    fn mutation_classification_includes_copies_and_lifetimes() {
        for event in [
            SortEvent::Swap {
                i: ElementRef::main(0),
                j: ElementRef::main(1),
            },
            SortEvent::Overwrite {
                dest: ElementRef::main(0),
                old_val: Some(1),
                new_val: Some(2),
            },
            SortEvent::Copy {
                src: ElementRef::main(0),
                dest: ElementRef::main(1),
                old_val: Some(2),
                new_val: Some(1),
            },
            SortEvent::AddArray {
                arr_id: 1,
                values: vec![None],
            },
            SortEvent::RemoveArray { arr_id: 1 },
        ] {
            assert!(event.is_mutation());
        }
        for event in [
            SortEvent::Compare {
                i: ElementRef::main(0),
                j: ElementRef::main(1),
            },
            SortEvent::EnterRange {
                arr_id: 0,
                lo: 0,
                hi: 1,
            },
            SortEvent::ExitRange {
                arr_id: 0,
                lo: 0,
                hi: 1,
            },
            SortEvent::Done,
        ] {
            assert!(!event.is_mutation());
        }
    }
}

#[cfg(all(test, target_arch = "wasm32"))]
mod wasm_tests {
    use super::*;
    use js_sys::{Array, Reflect};
    use wasm_bindgen_test::wasm_bindgen_test;

    #[wasm_bindgen_test]
    fn javascript_protocol_round_trips_all_events_and_uses_null_slots() {
        let auxiliary = ElementRef { arr_id: 1, idx: 0 };
        let events = vec![
            SortEvent::AddArray {
                arr_id: 1,
                values: vec![None, Some(0)],
            },
            SortEvent::Compare {
                i: auxiliary,
                j: ElementRef::main(0),
            },
            SortEvent::Swap {
                i: auxiliary,
                j: ElementRef::main(0),
            },
            SortEvent::Copy {
                src: auxiliary,
                dest: ElementRef::main(0),
                old_val: None,
                new_val: Some(0),
            },
            SortEvent::Overwrite {
                dest: auxiliary,
                old_val: Some(0),
                new_val: None,
            },
            SortEvent::EnterRange {
                arr_id: 1,
                lo: 0,
                hi: 1,
            },
            SortEvent::ExitRange {
                arr_id: 1,
                lo: 0,
                hi: 1,
            },
            SortEvent::RemoveArray { arr_id: 1 },
            SortEvent::Done,
        ];
        let js = events_to_js(&events).unwrap();
        let get =
            |object: &JsValue, key: &str| Reflect::get(object, &JsValue::from_str(key)).unwrap();
        let array = Array::from(&js);
        let values = Array::from(&get(&array.get(0), "values"));
        assert!(values.get(0).is_null());
        assert_eq!(values.get(1).as_f64(), Some(0.0));
        for idx in [0, 5, 6, 7] {
            assert_eq!(get(&array.get(idx), "arrId").as_f64(), Some(1.0));
            assert!(get(&array.get(idx), "arr_id").is_undefined());
        }
        let reference = get(&array.get(1), "i");
        assert_eq!(get(&reference, "arrId").as_f64(), Some(1.0));
        assert_eq!(get(&reference, "idx").as_f64(), Some(0.0));
        assert!(get(&array.get(3), "old_val").is_null());
        assert!(get(&array.get(4), "new_val").is_null());
        let decoded: Vec<SortEvent> = serde_wasm_bindgen::from_value(js).unwrap();
        assert_eq!(decoded, events);
    }
}
