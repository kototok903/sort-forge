//! Binary Insertion Sort implementation for V1 (Pregeneration) engine.
//!
//! Uses binary search to find the insertion position, reducing comparisons
//! from O(n) to O(log n) per element, though shifts remain O(n).

use crate::events::SortEvent;
use super::PregenSort;

pub struct BinaryInsertionSort;

impl PregenSort for BinaryInsertionSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        for i in 1..n {
            let value = array[i];

            // Binary search for insertion position in sorted portion [0, i)
            let insert_pos = binary_search_insert_pos(array, i, value, &mut events);

            // Shift elements right to make room (via overwrites)
            for j in (insert_pos..i).rev() {
                events.push(SortEvent::Overwrite {
                    idx: j + 1,
                    old_val: array[j + 1],
                    new_val: array[j],
                });
                array[j + 1] = array[j];
            }

            // Insert value at final position (only if it moved)
            if insert_pos != i {
                events.push(SortEvent::Overwrite {
                    idx: insert_pos,
                    old_val: array[insert_pos],
                    new_val: value,
                });
                array[insert_pos] = value;
            }
        }

        events.push(SortEvent::Done);
        events
    }
}

/// Binary search to find insertion position in sorted portion [0, right).
/// Returns the index where `value` should be inserted.
fn binary_search_insert_pos(
    array: &[i32],
    right: usize,
    value: i32,
    events: &mut Vec<SortEvent>,
) -> usize {
    let mut lo = 0;
    let mut hi = right;

    while lo < hi {
        let mid = lo + (hi - lo) / 2;

        // Compare with the element being inserted (at index `right`)
        events.push(SortEvent::Compare { i: mid, j: right });

        if array[mid] <= value {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }

    lo
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_binary_insertion_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = BinaryInsertionSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_binary_insertion_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = BinaryInsertionSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        // No overwrites needed for already sorted array
        let overwrite_count = events.iter().filter(|e| matches!(e, SortEvent::Overwrite { .. })).count();
        assert_eq!(overwrite_count, 0);
    }

    #[test]
    fn test_binary_insertion_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = BinaryInsertionSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_binary_insertion_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = BinaryInsertionSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_binary_insertion_sort_single() {
        let mut array = vec![42];
        let events = BinaryInsertionSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_binary_insertion_sort_uses_overwrites() {
        let mut array = vec![3, 1, 2];
        let events = BinaryInsertionSort::sort(&mut array);

        // Should use Overwrite events, not Swap
        let swap_count = events.iter().filter(|e| matches!(e, SortEvent::Swap { .. })).count();
        let overwrite_count = events.iter().filter(|e| matches!(e, SortEvent::Overwrite { .. })).count();
        assert_eq!(swap_count, 0);
        assert!(overwrite_count > 0);
    }

    #[test]
    fn test_binary_insertion_sort_fewer_comparisons() {
        use crate::pregen::insertion_sort::InsertionSort;

        // Binary insertion sort should have fewer comparisons than regular insertion sort
        // for reverse-sorted arrays
        let mut array1 = vec![10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
        let mut array2 = array1.clone();

        let events1 = BinaryInsertionSort::sort(&mut array1);
        let events2 = InsertionSort::sort(&mut array2);

        let cmp1 = events1.iter().filter(|e| matches!(e, SortEvent::Compare { .. })).count();
        let cmp2 = events2.iter().filter(|e| matches!(e, SortEvent::Compare { .. })).count();

        assert!(cmp1 < cmp2, "Binary insertion sort should have fewer comparisons");
    }
}
