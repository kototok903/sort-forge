//! Merge Sort implementation for V1 (Pregeneration) engine.
//!
//! Classic divide-and-conquer algorithm with O(n log n) time complexity.
//! Uses EnterRange/ExitRange events to visualize the recursive structure.

use super::PregenSort;
use crate::events::{ArrayId, ElementRef, SortEvent, MAIN_ARRAY_ID};

const AUX_ARRAY_ID: ArrayId = 1;

fn auxiliary(idx: usize) -> ElementRef {
    ElementRef {
        arr_id: AUX_ARRAY_ID,
        idx,
    }
}

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
        events.push(SortEvent::AddArray {
            arr_id: AUX_ARRAY_ID,
            length: n,
        });
        // The clone initializes actual storage; expose each initialization write.
        for (idx, &value) in array.iter().enumerate() {
            events.push(SortEvent::Copy {
                src: ElementRef::main(idx),
                dest: auxiliary(idx),
                old_val: None,
                new_val: Some(value),
            });
        }
        merge_sort_recursive(array, &mut aux, 0, n - 1, &mut events);

        events.push(SortEvent::RemoveArray {
            arr_id: AUX_ARRAY_ID,
        });
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

    events.push(SortEvent::EnterRange {
        arr_id: MAIN_ARRAY_ID,
        lo,
        hi,
    });

    let mid = lo + (hi - lo) / 2;

    // Sort left half
    merge_sort_recursive(array, aux, lo, mid, events);

    // Sort right half
    merge_sort_recursive(array, aux, mid + 1, hi, events);

    // Merge the two halves
    merge(array, aux, lo, mid, hi, events);

    events.push(SortEvent::ExitRange {
        arr_id: MAIN_ARRAY_ID,
        lo,
        hi,
    });
}

fn merge(
    array: &mut [i32],
    aux: &mut [i32],
    lo: usize,
    mid: usize,
    hi: usize,
    events: &mut Vec<SortEvent>,
) {
    events.push(SortEvent::EnterRange {
        arr_id: AUX_ARRAY_ID,
        lo,
        hi,
    });
    for idx in lo..=hi {
        events.push(SortEvent::Copy {
            src: ElementRef::main(idx),
            dest: auxiliary(idx),
            old_val: Some(aux[idx]),
            new_val: Some(array[idx]),
        });
        aux[idx] = array[idx];
    }

    let mut i = lo;
    let mut j = mid + 1;
    for k in lo..=hi {
        let src = if i > mid {
            let idx = j;
            j += 1;
            idx
        } else if j > hi {
            let idx = i;
            i += 1;
            idx
        } else {
            events.push(SortEvent::Compare {
                i: auxiliary(i),
                j: auxiliary(j),
            });
            if aux[i] <= aux[j] {
                let idx = i;
                i += 1;
                idx
            } else {
                let idx = j;
                j += 1;
                idx
            }
        };
        // Equal-value transfers are still real writes.
        events.push(SortEvent::Copy {
            src: auxiliary(src),
            dest: ElementRef::main(k),
            old_val: Some(array[k]),
            new_val: Some(aux[src]),
        });
        array[k] = aux[src];
    }
    events.push(SortEvent::ExitRange {
        arr_id: AUX_ARRAY_ID,
        lo,
        hi,
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn buffer_lifetime_and_equal_value_copies_are_recorded() {
        let mut array = [1, 1];
        let events = MergeSort::sort(&mut array);
        assert_eq!(
            events.first(),
            Some(&SortEvent::AddArray {
                arr_id: AUX_ARRAY_ID,
                length: 2
            })
        );
        assert_eq!(
            events[events.len() - 2],
            SortEvent::RemoveArray {
                arr_id: AUX_ARRAY_ID
            }
        );
        assert_eq!(
            events
                .iter()
                .filter(|e| matches!(e, SortEvent::Copy { .. }))
                .count(),
            6
        );
        assert_eq!(
            events
                .iter()
                .filter(|e| matches!(
                    e,
                    SortEvent::Copy {
                        old_val: Some(1),
                        new_val: Some(1),
                        ..
                    }
                ))
                .count(),
            4
        );
        assert!(events.iter().any(|e| matches!(e, SortEvent::Compare { i, j } if i.arr_id == AUX_ARRAY_ID && j.arr_id == AUX_ARRAY_ID)));
        assert!(!events
            .iter()
            .any(|e| matches!(e, SortEvent::Overwrite { .. })));
        for input in [vec![], vec![1]] {
            assert_eq!(MergeSort::sort(&mut input.clone()), vec![SortEvent::Done]);
        }
    }

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

        let enter_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::EnterRange { .. }))
            .count();
        let exit_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::ExitRange { .. }))
            .count();

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
