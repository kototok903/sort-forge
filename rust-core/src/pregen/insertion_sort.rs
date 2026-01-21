//! Insertion Sort implementation for V1 (Pregeneration) engine.

use crate::events::SortEvent;
use super::PregenSort;

pub struct InsertionSort;

impl PregenSort for InsertionSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        for i in 1..n {
            let value = array[i];
            let mut j = i;

            // Find insertion position and shift elements right
            while j > 0 {
                events.push(SortEvent::Compare { i: j - 1, j });

                if array[j - 1] > value {
                    // Shift element right
                    events.push(SortEvent::Overwrite {
                        idx: j,
                        old_val: array[j],
                        new_val: array[j - 1],
                    });
                    array[j] = array[j - 1];
                    j -= 1;
                } else {
                    break;
                }
            }

            // Insert value at final position (only if it moved)
            if j != i {
                events.push(SortEvent::Overwrite {
                    idx: j,
                    old_val: array[j],
                    new_val: value,
                });
                array[j] = value;
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
    fn test_insertion_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = InsertionSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_insertion_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = InsertionSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        // No overwrites needed for already sorted array
        let overwrite_count = events.iter().filter(|e| matches!(e, SortEvent::Overwrite { .. })).count();
        assert_eq!(overwrite_count, 0);
    }

    #[test]
    fn test_insertion_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = InsertionSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_insertion_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = InsertionSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_insertion_sort_single() {
        let mut array = vec![42];
        let events = InsertionSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_insertion_sort_uses_overwrites() {
        let mut array = vec![3, 1, 2];
        let events = InsertionSort::sort(&mut array);

        // Should use Overwrite events, not Swap
        let swap_count = events.iter().filter(|e| matches!(e, SortEvent::Swap { .. })).count();
        let overwrite_count = events.iter().filter(|e| matches!(e, SortEvent::Overwrite { .. })).count();
        assert_eq!(swap_count, 0);
        assert!(overwrite_count > 0);
    }
}
