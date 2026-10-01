//! Cycle Sort implementation for V1 (Pregeneration) engine.
//!
//! Minimizes the number of writes to the array. Optimal for situations
//! where writes are expensive (e.g., flash memory). Each element is
//! moved at most once to its final position.

use super::{saved_value::SavedValue, PregenSort};
use crate::events::{ElementRef, SortEvent};

pub struct CycleSort;

impl PregenSort for CycleSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        let mut item = SavedValue::new(1, &mut events);

        // Traverse array elements and put each to the right place
        for cycle_start in 0..n - 1 {
            // Initialize item as starting point
            item.save_from(array, cycle_start, &mut events);

            // Find position where we put the item.
            // Count all smaller elements on right side of item.
            let mut pos = cycle_start;
            for i in cycle_start + 1..n {
                events.push(SortEvent::Compare {
                    i: item.reference(),
                    j: ElementRef::main(i),
                });
                if array[i] < item.value() {
                    pos += 1;
                }
            }

            // If item is already in correct position
            if pos == cycle_start {
                continue;
            }

            // Ignore all duplicate elements
            loop {
                events.push(SortEvent::Compare {
                    i: item.reference(),
                    j: ElementRef::main(pos),
                });
                if item.value() != array[pos] {
                    break;
                }
                pos += 1;
            }

            // Put the item to its right position
            if pos != cycle_start {
                item.swap_with(array, pos, &mut events);
            }

            // Rotate rest of the cycle
            while pos != cycle_start {
                pos = cycle_start;

                // Find position where we put the element
                for i in cycle_start + 1..n {
                    events.push(SortEvent::Compare {
                        i: item.reference(),
                        j: ElementRef::main(i),
                    });
                    if array[i] < item.value() {
                        pos += 1;
                    }
                }

                // Ignore all duplicate elements
                loop {
                    events.push(SortEvent::Compare {
                        i: item.reference(),
                        j: ElementRef::main(pos),
                    });
                    if item.value() != array[pos] {
                        break;
                    }
                    pos += 1;
                }

                // Put the item to its right position
                if item.value() != array[pos] {
                    item.swap_with(array, pos, &mut events);
                }
            }
        }

        item.remove(&mut events);
        events.push(SortEvent::Done);
        events
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cycle_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = CycleSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_cycle_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = CycleSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        let swap_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::Swap { .. }))
            .count();
        assert_eq!(swap_count, 0);
    }

    #[test]
    fn test_cycle_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        CycleSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_cycle_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = CycleSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_cycle_sort_single() {
        let mut array = vec![42];
        let events = CycleSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_cycle_sort_duplicates() {
        let mut array = vec![3, 1, 3, 2, 1];
        let events = CycleSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_cycle_sort_uses_cross_array_swaps() {
        let mut array = vec![3, 1, 2];
        let events = CycleSort::sort(&mut array);

        // Each placement exchanges the held item with a main position
        let swap_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::Swap { .. }))
            .count();
        assert!(swap_count > 0);
        assert!(events
            .iter()
            .filter(|e| matches!(e, SortEvent::Swap { .. }))
            .all(|e| matches!(e, SortEvent::Swap { i, j } if i.arr_id == 1 && j.arr_id == 0)));
    }
}
