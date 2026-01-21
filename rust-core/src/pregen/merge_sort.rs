//! Merge Sort implementation for V1 (Pregeneration) engine.
//!
//! Classic divide-and-conquer algorithm with O(n log n) time complexity.
//! Uses EnterRange/ExitRange events to visualize the recursive structure.

use crate::events::SortEvent;
use super::PregenSort;

pub struct MergeSort;

impl PregenSort for MergeSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        let mut aux = array.to_vec();
        merge_sort_recursive(array, &mut aux, 0, n - 1, &mut events);

        events.push(SortEvent::Done);
        events
    }
}

fn merge_sort_recursive(
    array: &mut [i32],
    aux: &mut [i32],
    lo: usize,
    hi: usize,
    events: &mut Vec<SortEvent>,
) {
    if lo >= hi {
        return;
    }

    events.push(SortEvent::EnterRange { lo, hi });

    let mid = lo + (hi - lo) / 2;

    // Sort left half
    merge_sort_recursive(array, aux, lo, mid, events);

    // Sort right half
    merge_sort_recursive(array, aux, mid + 1, hi, events);

    // Merge the two halves
    merge(array, aux, lo, mid, hi, events);

    events.push(SortEvent::ExitRange { lo, hi });
}

fn merge(
    array: &mut [i32],
    aux: &mut [i32],
    lo: usize,
    mid: usize,
    hi: usize,
    events: &mut Vec<SortEvent>,
) {
    // Copy to auxiliary array
    for i in lo..=hi {
        aux[i] = array[i];
    }

    let mut i = lo;
    let mut j = mid + 1;

    for k in lo..=hi {
        if i > mid {
            // Left half exhausted, take from right
            if array[k] != aux[j] {
                events.push(SortEvent::Overwrite {
                    idx: k,
                    old_val: array[k],
                    new_val: aux[j],
                });
            }
            array[k] = aux[j];
            j += 1;
        } else if j > hi {
            // Right half exhausted, take from left
            if array[k] != aux[i] {
                events.push(SortEvent::Overwrite {
                    idx: k,
                    old_val: array[k],
                    new_val: aux[i],
                });
            }
            array[k] = aux[i];
            i += 1;
        } else {
            events.push(SortEvent::Compare { i, j });
            if aux[i] <= aux[j] {
                if array[k] != aux[i] {
                    events.push(SortEvent::Overwrite {
                        idx: k,
                        old_val: array[k],
                        new_val: aux[i],
                    });
                }
                array[k] = aux[i];
                i += 1;
            } else {
                if array[k] != aux[j] {
                    events.push(SortEvent::Overwrite {
                        idx: k,
                        old_val: array[k],
                        new_val: aux[j],
                    });
                }
                array[k] = aux[j];
                j += 1;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = MergeSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_merge_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        MergeSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_merge_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        MergeSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_merge_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = MergeSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_merge_sort_single() {
        let mut array = vec![42];
        let events = MergeSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_merge_sort_emits_range_events() {
        let mut array = vec![3, 1, 4, 1, 5];
        let events = MergeSort::sort(&mut array);

        let enter_count = events.iter().filter(|e| matches!(e, SortEvent::EnterRange { .. })).count();
        let exit_count = events.iter().filter(|e| matches!(e, SortEvent::ExitRange { .. })).count();

        assert!(enter_count > 0);
        assert_eq!(enter_count, exit_count);
    }

    #[test]
    fn test_merge_sort_duplicates() {
        let mut array = vec![3, 1, 3, 2, 1];
        let events = MergeSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }
}
