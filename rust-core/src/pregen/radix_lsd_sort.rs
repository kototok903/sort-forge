//! Radix Sort LSD (Least Significant Digit) implementation for V1 (Pregeneration) engine.
//!
//! Processes digits from least significant to most significant.
//! Uses counting sort as a stable subroutine for each digit.
//! Only works with non-negative integers.

use crate::events::SortEvent;
use super::PregenSort;

pub struct RadixLsdSort;

const RADIX: i32 = 10;

impl PregenSort for RadixLsdSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        // Find maximum value to determine number of digits
        let max_val = *array.iter().max().unwrap();
        if max_val < 0 {
            // Radix sort LSD only works with non-negative integers
            events.push(SortEvent::Done);
            return events;
        }

        // Process each digit position
        let mut exp = 1;
        while max_val / exp > 0 {
            counting_sort_by_digit(array, exp, &mut events);
            exp *= RADIX;
        }

        events.push(SortEvent::Done);
        events
    }
}

/// Counting sort based on digit at position exp (1, 10, 100, ...)
fn counting_sort_by_digit(array: &mut [i32], exp: i32, events: &mut Vec<SortEvent>) {
    let n = array.len();
    let mut output = vec![0; n];
    let mut count = vec![0usize; RADIX as usize];

    // Count occurrences of each digit
    for &val in array.iter() {
        let digit = ((val / exp) % RADIX) as usize;
        count[digit] += 1;
    }

    // Convert count to cumulative count (positions)
    for i in 1..RADIX as usize {
        count[i] += count[i - 1];
    }

    // Build output array (traverse in reverse for stability)
    for i in (0..n).rev() {
        let val = array[i];
        let digit = ((val / exp) % RADIX) as usize;
        count[digit] -= 1;
        let new_pos = count[digit];
        output[new_pos] = val;
    }

    // Copy output back to array with Overwrite events
    for i in 0..n {
        if array[i] != output[i] {
            // Emit compare to show which element we're looking at
            events.push(SortEvent::Compare { i, j: i });
            events.push(SortEvent::Overwrite {
                idx: i,
                old_val: array[i],
                new_val: output[i],
            });
            array[i] = output[i];
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_radix_sort_lsd_basic() {
        let mut array = vec![170, 45, 75, 90, 802, 24, 2, 66];
        let events = RadixLsdSort::sort(&mut array);

        assert_eq!(array, vec![2, 24, 45, 66, 75, 90, 170, 802]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_lsd_single_digit() {
        let mut array = vec![5, 3, 8, 4, 2, 9, 1, 7, 6];
        let events = RadixLsdSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5, 6, 7, 8, 9]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_lsd_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = RadixLsdSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_lsd_reverse() {
        let mut array = vec![50, 40, 30, 20, 10];
        let events = RadixLsdSort::sort(&mut array);

        assert_eq!(array, vec![10, 20, 30, 40, 50]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_lsd_empty() {
        let mut array: Vec<i32> = vec![];
        let events = RadixLsdSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_lsd_single() {
        let mut array = vec![42];
        let events = RadixLsdSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_lsd_duplicates() {
        let mut array = vec![5, 3, 5, 1, 3, 5, 1];
        let events = RadixLsdSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 3, 3, 5, 5, 5]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_lsd_uses_overwrites() {
        let mut array = vec![30, 20, 10];
        let events = RadixLsdSort::sort(&mut array);

        // Radix sort uses Overwrite events
        let overwrite_count = events.iter().filter(|e| matches!(e, SortEvent::Overwrite { .. })).count();
        assert!(overwrite_count > 0);
    }
}
