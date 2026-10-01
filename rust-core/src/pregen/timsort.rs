//! Tim Sort implementation for V1 (Pregeneration) engine.
//!
//! Hybrid sorting algorithm derived from merge sort and insertion sort.
//! Used in Python's sort() and Java's Arrays.sort(). Divides the array
//! into small "runs" which are sorted with insertion sort, then merged.

use super::{recorded_buffer::RecordedBuffer, saved_value::SavedValue, PregenSort};
use crate::events::{ElementRef, SortEvent, MAIN_ARRAY_ID};

pub struct Timsort;

/// Minimum run size. Smaller runs use insertion sort.
const MIN_RUN: usize = 32;

impl PregenSort for Timsort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        // Sort small runs with insertion sort
        let min_run = min_run_length(n);

        let mut saved = SavedValue::new(1, &mut events);
        for start in (0..n).step_by(min_run) {
            let end = (start + min_run - 1).min(n - 1);
            insertion_sort_range(array, start, end, &mut saved, &mut events);
        }

        saved.remove(&mut events);

        if min_run < n {
            let (left_capacity, right_capacity) = buffer_capacities(n, min_run);
            let mut left_buffer = RecordedBuffer::new(2, left_capacity, &mut events);
            let mut right_buffer = RecordedBuffer::new(3, right_capacity, &mut events);
            let mut size = min_run;
            while size < n {
                for left in (0..n).step_by(2 * size) {
                    let mid = (left + size - 1).min(n - 1);
                    let right = (left + 2 * size - 1).min(n - 1);
                    if mid < right {
                        events.push(SortEvent::EnterRange {
                            arr_id: MAIN_ARRAY_ID,
                            lo: left,
                            hi: right,
                        });
                        merge(
                            array,
                            left,
                            mid,
                            right,
                            &mut left_buffer,
                            &mut right_buffer,
                            &mut events,
                        );
                        events.push(SortEvent::ExitRange {
                            arr_id: MAIN_ARRAY_ID,
                            lo: left,
                            hi: right,
                        });
                    }
                }
                size *= 2;
            }
            left_buffer.remove(&mut events);
            right_buffer.remove(&mut events);
        }

        events.push(SortEvent::Done);
        events
    }
}

/// Calculate minimum run length.
fn min_run_length(mut n: usize) -> usize {
    let mut r = 0;
    while n >= MIN_RUN {
        r |= n & 1;
        n >>= 1;
    }
    n + r
}

/// Maximum actual left/right lengths in the existing bottom-up merge schedule.
fn buffer_capacities(n: usize, mut size: usize) -> (usize, usize) {
    let mut left = 0;
    let mut right = 0;
    while size < n {
        left = left.max(size);
        right = right.max(size.min(n - size));
        size *= 2;
    }
    (left, right)
}

/// Insertion sort for a range [lo, hi].
fn insertion_sort_range(
    array: &mut [i32],
    lo: usize,
    hi: usize,
    saved: &mut SavedValue,
    events: &mut Vec<SortEvent>,
) {
    for i in (lo + 1)..=hi {
        let value = saved.save_from(array, i, events);
        let mut j = i;

        while j > lo {
            events.push(SortEvent::Compare {
                i: ElementRef::main(j - 1),
                j: saved.reference(),
            });

            if array[j - 1] > value {
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

        if j != i {
            saved.write_to(array, j, events);
        }
    }
}

/// Merge two sorted subarrays [lo..mid] and [mid+1..hi].
fn merge(
    array: &mut [i32],
    lo: usize,
    mid: usize,
    hi: usize,
    left: &mut RecordedBuffer,
    right: &mut RecordedBuffer,
    events: &mut Vec<SortEvent>,
) {
    let left_len = mid - lo + 1;
    let right_len = hi - mid;
    left.enter_range(left_len, events);
    right.enter_range(right_len, events);
    for idx in 0..left_len {
        left.copy_from(array, lo + idx, idx, events);
    }
    for idx in 0..right_len {
        right.copy_from(array, mid + 1 + idx, idx, events);
    }
    let mut i = 0;
    let mut j = 0;
    for dest in lo..=hi {
        if i < left_len && j < right_len {
            events.push(SortEvent::Compare {
                i: left.reference(i),
                j: right.reference(j),
            });
        }
        if j == right_len || (i < left_len && left.value(i) <= right.value(j)) {
            left.copy_to(array, i, dest, events);
            i += 1;
        } else {
            right.copy_to(array, j, dest, events);
            j += 1;
        }
    }
    left.exit_range(left_len, events);
    right.exit_range(right_len, events);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reusable_buffers_cover_uneven_merge_schedules() {
        for n in 2usize..=129 {
            let mut array: Vec<i32> = (0..n)
                .map(|idx| ((idx * 17 + n) % 23) as i32 - 11)
                .collect();
            let mut expected = array.clone();
            expected.sort();
            let events = Timsort::sort(&mut array);
            assert_eq!(array, expected);
            let min_run = min_run_length(n);
            let additions: Vec<_> = events
                .iter()
                .filter(|event| matches!(event, SortEvent::AddArray { .. }))
                .collect();
            if min_run == n {
                assert_eq!(additions.len(), 1);
            } else {
                let (left, right) = buffer_capacities(n, min_run);
                assert_eq!(additions.len(), 3);
                assert_eq!(
                    additions[1],
                    &SortEvent::AddArray {
                        arr_id: 2,
                        length: left
                    }
                );
                assert_eq!(
                    additions[2],
                    &SortEvent::AddArray {
                        arr_id: 3,
                        length: right
                    }
                );
            }
        }
        assert_eq!(buffer_capacities(65, min_run_length(65)), (34, 31));
    }

    #[test]
    fn test_timsort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = Timsort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_timsort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        Timsort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_timsort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        Timsort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_timsort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = Timsort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_timsort_single() {
        let mut array = vec![42];
        let events = Timsort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_timsort_large() {
        let mut array: Vec<i32> = (0..100).rev().collect();
        let events = Timsort::sort(&mut array);

        let expected: Vec<i32> = (0..100).collect();
        assert_eq!(array, expected);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_timsort_duplicates() {
        let mut array = vec![3, 1, 3, 2, 1];
        Timsort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3]);
    }
}
