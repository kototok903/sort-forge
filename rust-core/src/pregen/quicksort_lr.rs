//! QuickSort (Left-Right pointers) implementation for V1 (Pregeneration) engine.
//!
//! Uses Hoare partition scheme with leftmost pivot.
//! Two pointers move toward each other from both ends.
//! Emits EnterRange/ExitRange events to visualize recursive subarrays.

use crate::events::SortEvent;
use super::PregenSort;

pub struct QuickSortLR;

impl PregenSort for QuickSortLR {
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

    // Recurse on left partition (includes pivot_idx)
    if pivot_idx > lo {
        quicksort_recursive(array, lo, pivot_idx, events);
    }

    // Recurse on right partition
    if pivot_idx + 1 < hi {
        quicksort_recursive(array, pivot_idx + 1, hi, events);
    }
}

/// Hoare partition scheme with leftmost pivot.
/// Two pointers move toward each other from both ends.
/// Returns the partition index.
fn partition(array: &mut [i32], lo: usize, hi: usize, events: &mut Vec<SortEvent>) -> usize {
    let pivot = array[lo];
    let mut left = lo;
    let mut right = hi;

    loop {
        // Move left pointer right while element is less than pivot
        while array[left] < pivot {
            events.push(SortEvent::Compare { i: left, j: lo });
            left += 1;
        }

        // Move right pointer left while element is greater than pivot
        while array[right] > pivot {
            events.push(SortEvent::Compare { i: right, j: lo });
            right -= 1;
        }

        // Emit compare for the stopping positions
        events.push(SortEvent::Compare { i: left, j: right });

        // If pointers crossed, we're done
        if left >= right {
            return right;
        }

        // Swap elements at left and right pointers
        events.push(SortEvent::Swap { i: left, j: right });
        array.swap(left, right);

        // Move pointers inward to continue
        left += 1;
        if right > 0 {
            right -= 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_quicksort_lr_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = QuickSortLR::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_lr_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = QuickSortLR::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_lr_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        QuickSortLR::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_quicksort_lr_empty() {
        let mut array: Vec<i32> = vec![];
        let events = QuickSortLR::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_lr_single() {
        let mut array = vec![42];
        let events = QuickSortLR::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_lr_duplicates() {
        let mut array = vec![3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
        let events = QuickSortLR::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_quicksort_lr_emits_range_events() {
        let mut array = vec![3, 1, 2];
        let events = QuickSortLR::sort(&mut array);

        let enter_count = events.iter().filter(|e| matches!(e, SortEvent::EnterRange { .. })).count();
        let exit_count = events.iter().filter(|e| matches!(e, SortEvent::ExitRange { .. })).count();

        // Should have balanced Enter/Exit events
        assert_eq!(enter_count, exit_count);
        assert!(enter_count > 0);
    }

    #[test]
    fn test_quicksort_lr_two_elements() {
        let mut array = vec![2, 1];
        let events = QuickSortLR::sort(&mut array);

        assert_eq!(array, vec![1, 2]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }
}
