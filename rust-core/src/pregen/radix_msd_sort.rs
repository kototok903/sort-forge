//! Radix Sort MSD (Most Significant Digit) implementation for V1 (Pregeneration) engine.
//!
//! Processes digits from most significant to least significant.
//! Recursively sorts each bucket. Only works with non-negative integers.

use crate::events::SortEvent;
use super::PregenSort;

pub struct RadixMsdSort;

const RADIX: usize = 10;

impl PregenSort for RadixMsdSort {
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
            // Radix sort MSD only works with non-negative integers
            events.push(SortEvent::Done);
            return events;
        }

        // Calculate the highest digit position
        let mut max_exp = 1;
        while max_val / max_exp >= RADIX as i32 {
            max_exp *= RADIX as i32;
        }

        // Start recursive MSD sort
        msd_sort(array, 0, n, max_exp, &mut events);

        events.push(SortEvent::Done);
        events
    }
}

/// Recursively sort array[lo..hi] by digit at position exp
fn msd_sort(array: &mut [i32], lo: usize, hi: usize, exp: i32, events: &mut Vec<SortEvent>) {
    if hi <= lo + 1 || exp == 0 {
        return;
    }

    // Enter range for visualization
    events.push(SortEvent::EnterRange { lo, hi: hi - 1 });

    // Count occurrences of each digit
    let mut count = vec![0usize; RADIX + 1];
    for i in lo..hi {
        let digit = ((array[i] / exp) % RADIX as i32) as usize;
        count[digit + 1] += 1;
    }

    // Convert to cumulative counts
    for i in 0..RADIX {
        count[i + 1] += count[i];
    }

    // Store original positions for stable distribution
    let mut temp = vec![0; hi - lo];
    for i in lo..hi {
        let digit = ((array[i] / exp) % RADIX as i32) as usize;
        temp[count[digit]] = array[i];
        count[digit] += 1;
    }

    // Copy back with Overwrite events
    // Reset count for tracking bucket boundaries
    let mut bucket_ends = vec![0usize; RADIX + 1];
    for i in 0..RADIX {
        bucket_ends[i + 1] = count[i];
    }

    for i in 0..(hi - lo) {
        let idx = lo + i;
        if array[idx] != temp[i] {
            events.push(SortEvent::Compare { i: idx, j: idx });
            events.push(SortEvent::Overwrite {
                idx,
                old_val: array[idx],
                new_val: temp[i],
            });
            array[idx] = temp[i];
        }
    }

    // Exit range
    events.push(SortEvent::ExitRange { lo, hi: hi - 1 });

    // Recursively sort each bucket
    if exp / RADIX as i32 > 0 {
        let next_exp = exp / RADIX as i32;

        // Recalculate bucket boundaries from scratch
        let mut count = vec![0usize; RADIX + 1];
        for i in lo..hi {
            let digit = ((array[i] / exp) % RADIX as i32) as usize;
            count[digit + 1] += 1;
        }
        for i in 0..RADIX {
            count[i + 1] += count[i];
        }

        for d in 0..RADIX {
            let bucket_lo = lo + count[d];
            let bucket_hi = lo + count[d + 1];
            if bucket_hi > bucket_lo + 1 {
                msd_sort(array, bucket_lo, bucket_hi, next_exp, events);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_radix_sort_msd_basic() {
        let mut array = vec![170, 45, 75, 90, 802, 24, 2, 66];
        let events = RadixMsdSort::sort(&mut array);

        assert_eq!(array, vec![2, 24, 45, 66, 75, 90, 170, 802]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_msd_single_digit() {
        let mut array = vec![5, 3, 8, 4, 2, 9, 1, 7, 6];
        let events = RadixMsdSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5, 6, 7, 8, 9]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_msd_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = RadixMsdSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_msd_reverse() {
        let mut array = vec![50, 40, 30, 20, 10];
        let events = RadixMsdSort::sort(&mut array);

        assert_eq!(array, vec![10, 20, 30, 40, 50]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_msd_empty() {
        let mut array: Vec<i32> = vec![];
        let events = RadixMsdSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_msd_single() {
        let mut array = vec![42];
        let events = RadixMsdSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_msd_duplicates() {
        let mut array = vec![5, 3, 5, 1, 3, 5, 1];
        let events = RadixMsdSort::sort(&mut array);

        assert_eq!(array, vec![1, 1, 3, 3, 5, 5, 5]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_radix_sort_msd_emits_range_events() {
        let mut array = vec![321, 123, 213, 312, 132, 231];
        let events = RadixMsdSort::sort(&mut array);

        let enter_count = events.iter().filter(|e| matches!(e, SortEvent::EnterRange { .. })).count();
        let exit_count = events.iter().filter(|e| matches!(e, SortEvent::ExitRange { .. })).count();

        assert!(enter_count > 0);
        assert_eq!(enter_count, exit_count);
    }
}
