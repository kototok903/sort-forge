//! Odd-Even Sort (Brick Sort) implementation for V1 (Pregeneration) engine.
//!
//! Compares and swaps adjacent pairs, alternating between odd-even and even-odd pairs.
//! Originally designed for parallel processors.

use crate::events::SortEvent;
use super::PregenSort;

pub struct OddEvenSort;

impl PregenSort for OddEvenSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        let mut sorted = false;

        while !sorted {
            sorted = true;

            // Odd phase: compare (1,2), (3,4), (5,6), ...
            for i in (1..n - 1).step_by(2) {
                events.push(SortEvent::Compare { i, j: i + 1 });

                if array[i] > array[i + 1] {
                    events.push(SortEvent::Swap { i, j: i + 1 });
                    array.swap(i, i + 1);
                    sorted = false;
                }
            }

            // Even phase: compare (0,1), (2,3), (4,5), ...
            for i in (0..n - 1).step_by(2) {
                events.push(SortEvent::Compare { i, j: i + 1 });

                if array[i] > array[i + 1] {
                    events.push(SortEvent::Swap { i, j: i + 1 });
                    array.swap(i, i + 1);
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
    fn test_odd_even_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = OddEvenSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_odd_even_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = OddEvenSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        let swap_count = events.iter().filter(|e| matches!(e, SortEvent::Swap { .. })).count();
        assert_eq!(swap_count, 0);
    }

    #[test]
    fn test_odd_even_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = OddEvenSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_odd_even_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = OddEvenSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_odd_even_sort_single() {
        let mut array = vec![42];
        let events = OddEvenSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }
}
