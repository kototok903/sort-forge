//! Selection Sort implementation for V1 (Pregeneration) engine.

use crate::events::SortEvent;
use super::PregenSort;

pub struct SelectionSort;

impl PregenSort for SelectionSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        for i in 0..n - 1 {
            let mut min_idx = i;

            // Find minimum element in unsorted portion
            for j in (i + 1)..n {
                events.push(SortEvent::Compare { i: min_idx, j });

                if array[j] < array[min_idx] {
                    min_idx = j;
                }
            }

            // Swap if minimum is not already in position
            if min_idx != i {
                events.push(SortEvent::Swap { i, j: min_idx });
                array.swap(i, min_idx);
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
    fn test_selection_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = SelectionSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_selection_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = SelectionSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        // Selection sort still does comparisons but no swaps
        let swap_count = events.iter().filter(|e| matches!(e, SortEvent::Swap { .. })).count();
        assert_eq!(swap_count, 0);
    }

    #[test]
    fn test_selection_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        SelectionSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_selection_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = SelectionSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_selection_sort_single() {
        let mut array = vec![42];
        let events = SelectionSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }
}
