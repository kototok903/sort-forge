//! Pancake Sort implementation for V1 (Pregeneration) engine.
//!
//! Sorts by repeatedly flipping (reversing) prefixes of the array.
//! The only allowed operation is a "flip" which reverses elements from 0 to k.

use crate::events::SortEvent;
use super::PregenSort;

pub struct PancakeSort;

impl PregenSort for PancakeSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        // Start from the full array and reduce the unsorted portion
        for size in (2..=n).rev() {
            // Find index of maximum element in array[0..size]
            let mut max_idx = 0;
            for i in 1..size {
                events.push(SortEvent::Compare { i: max_idx, j: i });
                if array[i] > array[max_idx] {
                    max_idx = i;
                }
            }

            // If max is already at the end, no flip needed
            if max_idx == size - 1 {
                continue;
            }

            // Flip max to front (if not already there)
            if max_idx > 0 {
                flip(array, max_idx, &mut events);
            }

            // Flip max to its final position
            flip(array, size - 1, &mut events);
        }

        events.push(SortEvent::Done);
        events
    }
}

/// Reverse elements from index 0 to k (inclusive).
fn flip(array: &mut [i32], k: usize, events: &mut Vec<SortEvent>) {
    let mut left = 0;
    let mut right = k;

    while left < right {
        events.push(SortEvent::Swap { i: left, j: right });
        array.swap(left, right);
        left += 1;
        right -= 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pancake_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = PancakeSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_pancake_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = PancakeSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        // Pancake sort still does comparisons but no swaps when sorted
        let swap_count = events.iter().filter(|e| matches!(e, SortEvent::Swap { .. })).count();
        assert_eq!(swap_count, 0);
    }

    #[test]
    fn test_pancake_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = PancakeSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_pancake_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = PancakeSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_pancake_sort_single() {
        let mut array = vec![42];
        let events = PancakeSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_pancake_sort_two_elements() {
        let mut array = vec![2, 1];
        let events = PancakeSort::sort(&mut array);

        assert_eq!(array, vec![1, 2]);
    }
}
