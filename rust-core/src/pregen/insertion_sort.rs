//! Insertion Sort implementation for V1 (Pregeneration) engine.

use super::{saved_value::SavedValue, PregenSort};
use crate::events::{ElementRef, SortEvent};

pub struct InsertionSort;

impl PregenSort for InsertionSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        let mut saved = SavedValue::new(1, &mut events);

        for i in 1..n {
            let value = saved.save_from(array, i, &mut events);
            let mut j = i;

            // Find insertion position and shift elements right
            while j > 0 {
                events.push(SortEvent::Compare {
                    i: ElementRef::main(j - 1),
                    j: saved.reference(),
                });

                if array[j - 1] > value {
                    // Shift element right
                    events.push(SortEvent::Copy {
                        src: ElementRef::main(j - 1),
                        dest: ElementRef::main(j),
                        old_val: Some(array[j]),
                        new_val: Some(array[j - 1]),
                    });
                    array[j] = array[j - 1];
                    j -= 1;
                } else {
                    break;
                }
            }

            // Insert value at final position (only if it moved)
            if j != i {
                saved.write_to(array, j, &mut events);
            }
            saved.consume(&mut events);
        }

        saved.remove(&mut events);
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
        // Sorted input saves values but does not write into main
        let copy_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::Copy { dest, .. } if dest.arr_id == 0))
            .count();
        assert_eq!(copy_count, 0);
    }

    #[test]
    fn test_insertion_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        InsertionSort::sort(&mut array);

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
    fn test_insertion_sort_uses_copies() {
        let mut array = vec![3, 1, 2];
        let events = InsertionSort::sort(&mut array);

        // Transfers use Copy events, not Swap
        let swap_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::Swap { .. }))
            .count();
        let copy_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::Copy { dest, .. } if dest.arr_id == 0))
            .count();
        assert_eq!(swap_count, 0);
        assert!(copy_count > 0);
    }
}
