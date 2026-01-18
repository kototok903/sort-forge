//! QuickSort implementation for V1 (Pregeneration) engine.
//!
//! Uses Lomuto partition scheme with rightmost pivot.
//! Emits EnterRange/ExitRange events to visualize recursive subarrays.

use crate::events::SortEvent;
use super::PregenSort;

pub struct QuickSort;

impl PregenSort for QuickSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n > 1 {
            quicksort_recursive(array, 0, n - 1, &mut events);
        }

        events.push(SortEvent::Done);
        events
    }
}

fn quicksort_recursive(array: &mut [i32], lo: usize, hi: usize, events: &mut Vec<SortEvent>) {
    if lo >= hi {
        return;
    }

    // Enter this subarray range
    events.push(SortEvent::EnterRange { lo, hi });

    let pivot_idx = partition(array, lo, hi, events);

    // Exit before recursing (range is done being partitioned)
    events.push(SortEvent::ExitRange { lo, hi });

    // Recurse on left partition
    if pivot_idx > lo {
        quicksort_recursive(array, lo, pivot_idx - 1, events);
    }

    // Recurse on right partition
    if pivot_idx < hi {
        quicksort_recursive(array, pivot_idx + 1, hi, events);
    }
}

/// Lomuto partition scheme with rightmost pivot.
/// Returns the final position of the pivot.
fn partition(array: &mut [i32], lo: usize, hi: usize, events: &mut Vec<SortEvent>) -> usize {
    let pivot = array[hi];
    let mut i = lo;

    for j in lo..hi {
        // Compare current element with pivot
        events.push(SortEvent::Compare { i: j, j: hi });

        if array[j] <= pivot {
            if i != j {
                events.push(SortEvent::Swap { i, j });
                array.swap(i, j);
            }
            i += 1;
        }
    }

    // Place pivot in its final position
    if i != hi {
        events.push(SortEvent::Swap { i, j: hi });
        array.swap(i, hi);
    }

    i
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quicksort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = QuickSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = QuickSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = QuickSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_quicksort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = QuickSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_single() {
        let mut array = vec![42];
        let events = QuickSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_duplicates() {
        let mut array = vec![3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
        let events = QuickSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_emits_range_events() {
        let mut array = vec![3, 1, 2];
        let events = QuickSort::sort(&mut array);

        let enter_count = events.iter().filter(|e| matches!(e, SortEvent::EnterRange { .. })).count();
        let exit_count = events.iter().filter(|e| matches!(e, SortEvent::ExitRange { .. })).count();

        // Should have balanced Enter/Exit events
        assert_eq!(enter_count, exit_count);
        assert!(enter_count > 0);
    }
}
