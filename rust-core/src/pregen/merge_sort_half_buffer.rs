//! Merge Sort (Half Buffer) implementation for V1 (Pregeneration) engine.
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

pub struct MergeSortHalfBuffer;

impl PregenSort for MergeSortHalfBuffer {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        // Reserve once. Slots are initialized only when a left half is copied.
        let capacity = n.div_ceil(2);
        let mut aux = Vec::with_capacity(capacity);
        events.push(SortEvent::AddArray {
            arr_id: AUX_ARRAY_ID,
            length: capacity,
        });
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
    aux: &mut Vec<i32>,
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
    aux: &mut Vec<i32>,
    lo: usize,
    mid: usize,
    hi: usize,
    events: &mut Vec<SortEvent>,
) {
    let left_len = mid - lo + 1;
    events.push(SortEvent::EnterRange {
        arr_id: AUX_ARRAY_ID,
        lo: 0,
        hi: left_len - 1,
    });
    for idx in 0..left_len {
        let value = array[lo + idx];
        events.push(SortEvent::Copy {
            src: ElementRef::main(lo + idx),
            dest: auxiliary(idx),
            old_val: aux.get(idx).copied(),
            new_val: Some(value),
        });
        if idx < aux.len() {
            aux[idx] = value;
        } else {
            aux.push(value);
        }
    }

    let mut i = 0;
    let mut j = mid + 1;
    let mut k = lo;
    while i < left_len {
        if j <= hi {
            events.push(SortEvent::Compare {
                i: auxiliary(i),
                j: ElementRef::main(j),
            });
        }
        let (src, value) = if j > hi || aux[i] <= array[j] {
            let src = auxiliary(i);
            let value = aux[i];
            i += 1;
            (src, value)
        } else {
            // With left values remaining, writes cannot overtake unread right values.
            debug_assert!(k < j);
            let src = ElementRef::main(j);
            let value = array[j];
            j += 1;
            (src, value)
        };
        // Equal-value transfers are still real writes. Ties choose left for stability.
        events.push(SortEvent::Copy {
            src,
            dest: ElementRef::main(k),
            old_val: Some(array[k]),
            new_val: Some(value),
        });
        array[k] = value;
        k += 1;
    }
    // Once left is exhausted, the right tail is already in its final position.
    events.push(SortEvent::ConsumeArray {
        arr_id: AUX_ARRAY_ID,
    });
    events.push(SortEvent::ExitRange {
        arr_id: AUX_ARRAY_ID,
        lo: 0,
        hi: left_len - 1,
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn half_buffer_handles_uneven_lengths_and_duplicate_values() {
        for n in 2usize..=65 {
            let mut array: Vec<i32> = (0..n)
                .map(|idx| ((idx * 17 + n * 3) % 11) as i32 - 5)
                .collect();
            let mut expected = array.clone();
            expected.sort();
            let events = MergeSortHalfBuffer::sort(&mut array);
            assert_eq!(array, expected);
            assert_eq!(
                events.first(),
                Some(&SortEvent::AddArray {
                    arr_id: AUX_ARRAY_ID,
                    length: n.div_ceil(2)
                })
            );
            for event in events {
                if let SortEvent::Copy { src, dest, .. } = event {
                    for reference in [src, dest] {
                        if reference.arr_id == AUX_ARRAY_ID {
                            assert!(reference.idx < n.div_ceil(2));
                        }
                    }
                }
            }
        }
    }

    #[test]
    fn buffer_lifetime_and_equal_value_copies_are_recorded() {
        let mut array = [1, 1];
        let events = MergeSortHalfBuffer::sort(&mut array);
        assert_eq!(
            events.first(),
            Some(&SortEvent::AddArray {
                arr_id: AUX_ARRAY_ID,
                length: 1
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
            2
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
            1
        );
        assert!(events.iter().any(|e| matches!(e, SortEvent::Compare { i, j } if i.arr_id == AUX_ARRAY_ID && j.arr_id == MAIN_ARRAY_ID)));
        assert!(!events
            .iter()
            .any(|e| matches!(e, SortEvent::Overwrite { .. })));
        for input in [vec![], vec![1]] {
            assert_eq!(
                MergeSortHalfBuffer::sort(&mut input.clone()),
                vec![SortEvent::Done]
            );
        }
    }

    #[test]
    fn test_merge_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = MergeSortHalfBuffer::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_merge_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        MergeSortHalfBuffer::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_merge_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        MergeSortHalfBuffer::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_merge_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = MergeSortHalfBuffer::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_merge_sort_single() {
        let mut array = vec![42];
        let events = MergeSortHalfBuffer::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_merge_sort_emits_range_events() {
        let mut array = vec![3, 1, 4, 1, 5];
        let events = MergeSortHalfBuffer::sort(&mut array);

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
        let events = MergeSortHalfBuffer::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }
}
