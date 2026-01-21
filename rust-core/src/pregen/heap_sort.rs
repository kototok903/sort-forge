//! Heap Sort implementation for V1 (Pregeneration) engine.
//!
//! Builds a max-heap and repeatedly extracts the maximum element.
//! In-place with O(n log n) time complexity.

use crate::events::SortEvent;
use super::PregenSort;

pub struct HeapSort;

impl PregenSort for HeapSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        // Build max heap (heapify)
        for i in (0..n / 2).rev() {
            sift_down(array, i, n, &mut events);
        }

        // Extract elements from heap one by one
        for end in (1..n).rev() {
            // Move current root (max) to end
            events.push(SortEvent::Swap { i: 0, j: end });
            array.swap(0, end);

            // Restore heap property for reduced heap
            sift_down(array, 0, end, &mut events);
        }

        events.push(SortEvent::Done);
        events
    }
}

/// Sift down element at index `root` to maintain heap property.
/// Only considers elements in range [0, end).
fn sift_down(array: &mut [i32], root: usize, end: usize, events: &mut Vec<SortEvent>) {
    let mut current = root;

    loop {
        let left = 2 * current + 1;
        let right = 2 * current + 2;
        let mut largest = current;

        // Compare with left child
        if left < end {
            events.push(SortEvent::Compare { i: largest, j: left });
            if array[left] > array[largest] {
                largest = left;
            }
        }

        // Compare with right child
        if right < end {
            events.push(SortEvent::Compare { i: largest, j: right });
            if array[right] > array[largest] {
                largest = right;
            }
        }

        // If largest is not root, swap and continue
        if largest != current {
            events.push(SortEvent::Swap { i: current, j: largest });
            array.swap(current, largest);
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
    fn test_heap_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = HeapSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_heap_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = HeapSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_heap_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = HeapSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_heap_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = HeapSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_heap_sort_single() {
        let mut array = vec![42];
        let events = HeapSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_heap_sort_duplicates() {
        let mut array = vec![3, 1, 3, 2, 1];
        let events = HeapSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 2, 3, 3]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_heap_sort_large() {
        let mut array = vec![10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
        let events = HeapSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
}
