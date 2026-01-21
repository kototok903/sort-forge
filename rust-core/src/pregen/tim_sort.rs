//! Tim Sort implementation for V1 (Pregeneration) engine.
//!
//! Hybrid sorting algorithm derived from merge sort and insertion sort.
//! Used in Python's sort() and Java's Arrays.sort(). Divides the array
//! into small "runs" which are sorted with insertion sort, then merged.

use crate::events::SortEvent;
use super::PregenSort;

pub struct TimSort;

/// Minimum run size. Smaller runs use insertion sort.
const MIN_RUN: usize = 32;

impl PregenSort for TimSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        // Sort small runs with insertion sort
        let min_run = min_run_length(n);

        for start in (0..n).step_by(min_run) {
            let end = (start + min_run - 1).min(n - 1);
            insertion_sort_range(array, start, end, &mut events);
        }

        // Merge runs
        let mut size = min_run;
        while size < n {
            for left in (0..n).step_by(2 * size) {
                let mid = (left + size - 1).min(n - 1);
                let right = (left + 2 * size - 1).min(n - 1);

                if mid < right {
                    events.push(SortEvent::EnterRange { lo: left, hi: right });
                    merge(array, left, mid, right, &mut events);
                    events.push(SortEvent::ExitRange { lo: left, hi: right });
                }
            }
            size *= 2;
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

/// Insertion sort for a range [lo, hi].
fn insertion_sort_range(array: &mut [i32], lo: usize, hi: usize, events: &mut Vec<SortEvent>) {
    for i in (lo + 1)..=hi {
        let value = array[i];
        let mut j = i;

        while j > lo {
            events.push(SortEvent::Compare { i: j - 1, j });

            if array[j - 1] > value {
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

        if j != i {
            events.push(SortEvent::Overwrite {
                idx: j,
                old_val: array[j],
                new_val: value,
            });
            array[j] = value;
        }
    }
}

/// Merge two sorted subarrays [lo..mid] and [mid+1..hi].
fn merge(array: &mut [i32], lo: usize, mid: usize, hi: usize, events: &mut Vec<SortEvent>) {
    let left: Vec<i32> = array[lo..=mid].to_vec();
    let right: Vec<i32> = array[mid + 1..=hi].to_vec();

    let mut i = 0;
    let mut j = 0;
    let mut k = lo;

    while i < left.len() && j < right.len() {
        // Compare indices in original array for visualization
        let left_idx = lo + i;
        let right_idx = mid + 1 + j;
        events.push(SortEvent::Compare { i: left_idx.min(hi), j: right_idx.min(hi) });

        if left[i] <= right[j] {
            if array[k] != left[i] {
                events.push(SortEvent::Overwrite {
                    idx: k,
                    old_val: array[k],
                    new_val: left[i],
                });
            }
            array[k] = left[i];
            i += 1;
        } else {
            if array[k] != right[j] {
                events.push(SortEvent::Overwrite {
                    idx: k,
                    old_val: array[k],
                    new_val: right[j],
                });
            }
            array[k] = right[j];
            j += 1;
        }
        k += 1;
    }

    // Copy remaining elements
    while i < left.len() {
        if array[k] != left[i] {
            events.push(SortEvent::Overwrite {
                idx: k,
                old_val: array[k],
                new_val: left[i],
            });
        }
        array[k] = left[i];
        i += 1;
        k += 1;
    }

    while j < right.len() {
        if array[k] != right[j] {
            events.push(SortEvent::Overwrite {
                idx: k,
                old_val: array[k],
                new_val: right[j],
            });
        }
        array[k] = right[j];
        j += 1;
        k += 1;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tim_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = TimSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_tim_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = TimSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_tim_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = TimSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_tim_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = TimSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_tim_sort_single() {
        let mut array = vec![42];
        let events = TimSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_tim_sort_large() {
        let mut array: Vec<i32> = (0..100).rev().collect();
        let events = TimSort::sort(&mut array);

        let expected: Vec<i32> = (0..100).collect();
        assert_eq!(array, expected);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_tim_sort_duplicates() {
        let mut array = vec![3, 1, 3, 2, 1];
        let events = TimSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3]);
    }
}
