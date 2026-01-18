//! Bubble Sort implementation for V1 (Pregeneration) engine.

use crate::events::SortEvent;
use super::PregenSort;

pub struct BubbleSort;

impl PregenSort for BubbleSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        for i in 0..n {
            let mut swapped = false;

            for j in 0..n - 1 - i {
                // Emit compare event
                events.push(SortEvent::Compare { i: j, j: j + 1 });

                if array[j] > array[j + 1] {
                    // Emit swap event and perform swap
                    events.push(SortEvent::Swap { i: j, j: j + 1 });
                    array.swap(j, j + 1);
                    swapped = true;
                }
            }

            // Early termination if no swaps occurred
            if !swapped {
                break;
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
    fn test_bubble_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = BubbleSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bubble_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = BubbleSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        // Should have only compares and Done (no swaps)
        let swap_count = events.iter().filter(|e| matches!(e, SortEvent::Swap { .. })).count();
        assert_eq!(swap_count, 0);
    }

    #[test]
    fn test_bubble_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = BubbleSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_bubble_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = BubbleSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bubble_sort_single() {
        let mut array = vec![42];
        let events = BubbleSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }
}
