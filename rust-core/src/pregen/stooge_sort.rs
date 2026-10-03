//! Stooge Sort implementation for V1 (Pregeneration) engine.
//!
//! Compares and swaps the endpoints, then recursively sorts the first,
//! last, and first overlapping two-thirds of the range.

use super::PregenSort;
use crate::events::{ElementRef, SortEvent, MAIN_ARRAY_ID};

pub struct StoogeSort;

impl PregenSort for StoogeSort {
    const MAX_ARRAY_SIZE: Option<usize> = Some(32);

    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n > 1 {
            stooge_sort_recursive(array, 0, n - 1, &mut events);
        }

        events.push(SortEvent::Done);
        events
    }
}

fn stooge_sort_recursive(array: &mut [i32], lo: usize, hi: usize, events: &mut Vec<SortEvent>) {
    if lo >= hi {
        return;
    }

    // Enter this subarray range
    events.push(SortEvent::EnterRange {
        arr_id: MAIN_ARRAY_ID,
        lo,
        hi,
    });

    // Compare the endpoints before deciding whether to swap them.
    events.push(SortEvent::Compare {
        i: ElementRef::main(lo),
        j: ElementRef::main(hi),
    });

    // If first > last, swap them
    if array[lo] > array[hi] {
        events.push(SortEvent::Swap {
            i: ElementRef::main(lo),
            j: ElementRef::main(hi),
        });
        array.swap(lo, hi);
    }

    // If there are more than 2 elements in the array, sort recursively
    if hi - lo + 1 > 2 {
        let t = (hi - lo + 1) / 3;

        // Sort first 2/3
        stooge_sort_recursive(array, lo, hi - t, events);

        // Sort last 2/3
        stooge_sort_recursive(array, lo + t, hi, events);

        // Sort first 2/3 again
        stooge_sort_recursive(array, lo, hi - t, events);
    }

    events.push(SortEvent::ExitRange {
        arr_id: MAIN_ARRAY_ID,
        lo,
        hi,
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_stooge_sort_compares_before_swap() {
        for input in [[1, 2], [2, 1], [1, 1]] {
            let mut array = input;
            let events = StoogeSort::sort(&mut array);
            assert!(matches!(
                events[1],
                SortEvent::Compare { i, j }
                    if i == ElementRef::main(0) && j == ElementRef::main(1)
            ));
            assert_eq!(events.len(), if input[0] > input[1] { 5 } else { 4 });
            if input[0] > input[1] {
                assert!(matches!(events[2], SortEvent::Swap { .. }));
            }
            assert!(array[0] <= array[1]);
        }
    }

    #[test]
    fn test_stooge_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = StoogeSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_stooge_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = StoogeSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_stooge_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        StoogeSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_stooge_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = StoogeSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_stooge_sort_single() {
        let mut array = vec![42];
        let events = StoogeSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_stooge_sort_duplicates() {
        let mut array = vec![3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
        let events = StoogeSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_stooge_sort_emits_range_events() {
        let mut array = vec![3, 1, 2];
        let events = StoogeSort::sort(&mut array);

        let enter_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::EnterRange { .. }))
            .count();
        let exit_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::ExitRange { .. }))
            .count();

        // Should have balanced Enter/Exit events
        assert_eq!(enter_count, exit_count);
        assert!(enter_count > 0);
    }
}
