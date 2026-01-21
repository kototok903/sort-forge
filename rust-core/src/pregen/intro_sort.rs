//! Introsort implementation for V1 (Pregeneration) engine.
//!
//! Hybrid sorting algorithm that begins with quicksort and switches to
//! heapsort when the recursion depth exceeds a level based on log(n).
//! Falls back to insertion sort for small subarrays. Used in C++ STL.

use crate::events::SortEvent;
use super::PregenSort;

pub struct IntroSort;

/// Threshold for switching to insertion sort.
const INSERTION_THRESHOLD: usize = 16;

impl PregenSort for IntroSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        // Maximum depth before switching to heapsort: 2 * floor(log2(n))
        let max_depth = 2 * (n as f64).log2().floor() as usize;

        introsort_recursive(array, 0, n - 1, max_depth, &mut events);

        events.push(SortEvent::Done);
        events
    }
}

fn introsort_recursive(
    array: &mut [i32],
    lo: usize,
    hi: usize,
    depth_limit: usize,
    events: &mut Vec<SortEvent>,
) {
    let size = hi - lo + 1;

    // Use insertion sort for small subarrays
    if size <= INSERTION_THRESHOLD {
        insertion_sort_range(array, lo, hi, events);
        return;
    }

    // Switch to heapsort if depth limit reached
    if depth_limit == 0 {
        heapsort_range(array, lo, hi, events);
        return;
    }

    events.push(SortEvent::EnterRange { lo, hi });

    // Quicksort partitioning
    let pivot_idx = partition(array, lo, hi, events);

    events.push(SortEvent::ExitRange { lo, hi });

    // Recurse on subarrays
    if pivot_idx > lo {
        introsort_recursive(array, lo, pivot_idx - 1, depth_limit - 1, events);
    }
    if pivot_idx < hi {
        introsort_recursive(array, pivot_idx + 1, hi, depth_limit - 1, events);
    }
}

/// Partition using median-of-three pivot selection.
fn partition(array: &mut [i32], lo: usize, hi: usize, events: &mut Vec<SortEvent>) -> usize {
    // Median-of-three pivot selection
    let mid = lo + (hi - lo) / 2;

    // Sort lo, mid, hi to get median
    events.push(SortEvent::Compare { i: lo, j: mid });
    if array[lo] > array[mid] {
        events.push(SortEvent::Swap { i: lo, j: mid });
        array.swap(lo, mid);
    }

    events.push(SortEvent::Compare { i: lo, j: hi });
    if array[lo] > array[hi] {
        events.push(SortEvent::Swap { i: lo, j: hi });
        array.swap(lo, hi);
    }

    events.push(SortEvent::Compare { i: mid, j: hi });
    if array[mid] > array[hi] {
        events.push(SortEvent::Swap { i: mid, j: hi });
        array.swap(mid, hi);
    }

    // Move median to hi-1 as pivot
    events.push(SortEvent::Swap { i: mid, j: hi - 1 });
    array.swap(mid, hi - 1);

    let pivot = array[hi - 1];
    let mut i = lo;
    let mut j = hi - 1;

    loop {
        // Find element >= pivot from left
        loop {
            i += 1;
            if i >= j {
                break;
            }
            events.push(SortEvent::Compare { i, j: hi - 1 });
            if array[i] >= pivot {
                break;
            }
        }

        // Find element <= pivot from right
        loop {
            j -= 1;
            if j <= i {
                break;
            }
            events.push(SortEvent::Compare { i: j, j: hi - 1 });
            if array[j] <= pivot {
                break;
            }
        }

        if i >= j {
            break;
        }

        events.push(SortEvent::Swap { i, j });
        array.swap(i, j);
    }

    // Restore pivot
    events.push(SortEvent::Swap { i, j: hi - 1 });
    array.swap(i, hi - 1);

    i
}

/// Insertion sort for a range.
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

/// Heapsort for a range.
fn heapsort_range(array: &mut [i32], lo: usize, hi: usize, events: &mut Vec<SortEvent>) {
    let n = hi - lo + 1;

    // Build max heap
    for i in (0..n / 2).rev() {
        sift_down(array, lo, i, n, events);
    }

    // Extract elements
    for end in (1..n).rev() {
        events.push(SortEvent::Swap { i: lo, j: lo + end });
        array.swap(lo, lo + end);
        sift_down(array, lo, 0, end, events);
    }
}

/// Sift down for heapsort within a range.
fn sift_down(array: &mut [i32], base: usize, root: usize, end: usize, events: &mut Vec<SortEvent>) {
    let mut current = root;

    loop {
        let left = 2 * current + 1;
        let right = 2 * current + 2;
        let mut largest = current;

        if left < end {
            events.push(SortEvent::Compare { i: base + largest, j: base + left });
            if array[base + left] > array[base + largest] {
                largest = left;
            }
        }

        if right < end {
            events.push(SortEvent::Compare { i: base + largest, j: base + right });
            if array[base + right] > array[base + largest] {
                largest = right;
            }
        }

        if largest != current {
            events.push(SortEvent::Swap { i: base + current, j: base + largest });
            array.swap(base + current, base + largest);
            current = largest;
        } else {
            break;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_intro_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = IntroSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_intro_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = IntroSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_intro_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = IntroSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_intro_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = IntroSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_intro_sort_single() {
        let mut array = vec![42];
        let events = IntroSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_intro_sort_large() {
        let mut array: Vec<i32> = (0..100).rev().collect();
        let events = IntroSort::sort(&mut array);

        let expected: Vec<i32> = (0..100).collect();
        assert_eq!(array, expected);
    }

    #[test]
    fn test_intro_sort_duplicates() {
        let mut array = vec![3, 1, 3, 2, 1];
        let events = IntroSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3]);
    }

    #[test]
    fn test_intro_sort_uses_range_events() {
        let mut array: Vec<i32> = (0..50).rev().collect();
        let events = IntroSort::sort(&mut array);

        let enter_count = events.iter().filter(|e| matches!(e, SortEvent::EnterRange { .. })).count();
        let exit_count = events.iter().filter(|e| matches!(e, SortEvent::ExitRange { .. })).count();

        assert!(enter_count > 0);
        assert_eq!(enter_count, exit_count);
    }
}
