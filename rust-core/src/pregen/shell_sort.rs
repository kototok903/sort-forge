//! Shell Sort implementation for V1 (Pregeneration) engine.
//!
//! Generalization of insertion sort that allows exchange of far apart elements.
//! Uses a gap sequence that decreases to 1. This implementation uses the
//! original Shell sequence (n/2, n/4, ..., 1).

use super::{saved_value::SavedValue, PregenSort};
use crate::events::{ElementRef, SortEvent};

pub struct ShellSort;

impl PregenSort for ShellSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        let mut saved = SavedValue::new(1, &mut events);

        // Start with a large gap, then reduce
        let mut gap = n / 2;

        while gap > 0 {
            // Perform gapped insertion sort
            for i in gap..n {
                let value = saved.save_from(array, i, &mut events);
                let mut j = i;

                // Shift earlier gap-sorted elements up until correct position found
                while j >= gap {
                    events.push(SortEvent::Compare {
                        i: ElementRef::main(j - gap),
                        j: saved.reference(),
                    });

                    if array[j - gap] > value {
                        events.push(SortEvent::Copy {
                            src: ElementRef::main(j - gap),
                            dest: ElementRef::main(j),
                            old_val: Some(array[j]),
                            new_val: Some(array[j - gap]),
                        });
                        array[j] = array[j - gap];
                        j -= gap;
                    } else {
                        break;
                    }
                }

                // Place value at its correct position
                if j != i {
                    saved.write_to(array, j, &mut events);
                }
            }

            gap /= 2;
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
    fn test_shell_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = ShellSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_shell_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = ShellSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        let copy_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::Copy { dest, .. } if dest.arr_id == 0))
            .count();
        assert_eq!(copy_count, 0);
    }

    #[test]
    fn test_shell_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        ShellSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_shell_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = ShellSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_shell_sort_single() {
        let mut array = vec![42];
        let events = ShellSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_shell_sort_uses_copies() {
        let mut array = vec![3, 1, 2];
        let events = ShellSort::sort(&mut array);

        // Transfers use Copy events (like insertion sort)
        let swap_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::Swap { .. }))
            .count();
        assert_eq!(swap_count, 0);
        assert!(events.iter().any(|e| matches!(e, SortEvent::Copy { .. })));
    }

    #[test]
    fn test_shell_sort_large() {
        let mut array = vec![10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
        let events = ShellSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }
}
