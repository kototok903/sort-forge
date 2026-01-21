//! Comb Sort implementation for V1 (Pregeneration) engine.
//!
//! Improves on bubble sort by using a gap sequence that shrinks by a factor
//! of ~1.3 (the "shrink factor"). Eliminates "turtles" (small values near
//! the end) more efficiently than bubble sort.

use crate::events::SortEvent;
use super::PregenSort;

pub struct CombSort;

/// The shrink factor. 1.3 is empirically optimal.
const SHRINK_FACTOR: f64 = 1.3;

impl PregenSort for CombSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        let mut gap = n;
        let mut sorted = false;

        while !sorted {
            // Shrink the gap
            gap = ((gap as f64) / SHRINK_FACTOR).floor() as usize;
            if gap <= 1 {
                gap = 1;
                sorted = true; // Will become false if any swap happens
            }

            // Compare elements with current gap
            for i in 0..n - gap {
                let j = i + gap;
                events.push(SortEvent::Compare { i, j });

                if array[i] > array[j] {
                    events.push(SortEvent::Swap { i, j });
                    array.swap(i, j);
                    sorted = false;
                }
            }
        }

        events.push(SortEvent::Done);
        events
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_comb_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = CombSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_comb_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = CombSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        let swap_count = events.iter().filter(|e| matches!(e, SortEvent::Swap { .. })).count();
        assert_eq!(swap_count, 0);
    }

    #[test]
    fn test_comb_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        CombSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_comb_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = CombSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_comb_sort_single() {
        let mut array = vec![42];
        let events = CombSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_comb_sort_turtle_case() {
        // "Turtle" case: small value at end
        let mut array = vec![2, 3, 4, 5, 1];
        CombSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_comb_sort_large() {
        let mut array = vec![10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
        CombSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
}
