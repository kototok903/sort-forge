//! V1 Engine: Pregeneration sorting algorithms.
//!
//! These are standard, recursive implementations that run to completion
//! and collect all events into a vector. Optimized for simplicity and
//! timeline scrubbing, but uses O(N²) memory for events.

pub mod bubble_sort;
pub mod quicksort;

use crate::events::SortEvent;

/// Trait for pregeneration sorting algorithms.
/// Algorithms run to completion and return all events.
pub trait PregenSort {
    /// Sort the array and return all events that occurred.
    /// The array is modified in place.
    fn sort(array: &mut [i32]) -> Vec<SortEvent>;
}

/// Available sorting algorithms for V1 engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Algorithm {
    Bubble,
    QuickSort,
}

impl Algorithm {
    /// Parse algorithm name from string.
    pub fn from_str(s: &str) -> Option<Algorithm> {
        match s.to_lowercase().as_str() {
            "bubble" | "bubblesort" | "bubble_sort" => Some(Algorithm::Bubble),
            "quick" | "quicksort" | "quick_sort" => Some(Algorithm::QuickSort),
            _ => None,
        }
    }
}

/// Run a pregeneration sort on the given array.
/// Returns the sorted array and all events.
pub fn pregen_sort(algorithm: Algorithm, array: &mut [i32]) -> Vec<SortEvent> {
    match algorithm {
        Algorithm::Bubble => bubble_sort::BubbleSort::sort(array),
        Algorithm::QuickSort => quicksort::QuickSort::sort(array),
    }
}
