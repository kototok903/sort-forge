//! Bitonic Sort implementation for V1 (Pregeneration) engine.
//!
//! A parallel sorting algorithm based on bitonic sequences.
//! Note: Classic bitonic sort requires array length to be a power of 2.
//! This implementation pads arrays internally to handle arbitrary sizes.

use crate::events::SortEvent;
use super::PregenSort;

pub struct BitonicSort;

impl PregenSort for BitonicSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        // Bitonic sort requires power-of-2 length
        // Pad array to next power of 2 with i32::MAX as sentinel
        let padded_len = n.next_power_of_two();
        let mut padded: Vec<i32> = array.to_vec();
        padded.resize(padded_len, i32::MAX);

        // Track what the frontend sees (only events within bounds)
        let mut frontend_view = array.to_vec();

        // Iterative bitonic sort
        let mut k = 2;
        while k <= padded_len {
            let mut j = k / 2;
            while j > 0 {
                for i in 0..padded_len {
                    let l = i ^ j;
                    if l > i {
                        let ascending = (i & k) == 0;
                        let should_swap = if ascending {
                            padded[i] > padded[l]
                        } else {
                            padded[i] < padded[l]
                        };

                        // Only emit events for indices within the original array
                        if i < n && l < n {
                            events.push(SortEvent::Compare { i, j: l });
                            if should_swap {
                                events.push(SortEvent::Swap { i, j: l });
                                frontend_view.swap(i, l);
                            }
                        }

                        if should_swap {
                            padded.swap(i, l);
                        }
                    }
                }
                j /= 2;
            }
            k *= 2;
        }

        // Copy back (only the original n elements)
        array.copy_from_slice(&padded[..n]);

        // Emit correction Overwrite events for any positions that diverged
        // due to swaps with padding area
        for i in 0..n {
            if frontend_view[i] != array[i] {
                events.push(SortEvent::Overwrite {
                    idx: i,
                    old_val: frontend_view[i],
                    new_val: array[i],
                });
            }
        }

        events.push(SortEvent::Done);
        events
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bitonic_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2, 7, 1, 6];
        let events = BitonicSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5, 6, 7, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bitonic_sort_power_of_2() {
        let mut array = vec![16, 8, 4, 2, 1, 3, 5, 7, 9, 11, 13, 15, 14, 12, 10, 6];
        let events = BitonicSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bitonic_sort_non_power_of_2() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = BitonicSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bitonic_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5, 6, 7, 8];
        let events = BitonicSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5, 6, 7, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bitonic_sort_reverse() {
        let mut array = vec![8, 7, 6, 5, 4, 3, 2, 1];
        let events = BitonicSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5, 6, 7, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bitonic_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = BitonicSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bitonic_sort_single() {
        let mut array = vec![42];
        let events = BitonicSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bitonic_sort_duplicates() {
        let mut array = vec![5, 3, 5, 1, 3, 5, 1, 3];
        let events = BitonicSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 3, 3, 3, 5, 5, 5]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bitonic_sort_two_elements() {
        let mut array = vec![2, 1];
        let events = BitonicSort::sort(&mut array);

        assert_eq!(array, vec![1, 2]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }
}
