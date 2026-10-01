//! Radix Sort MSD (Most Significant Digit) implementation for V1 (Pregeneration) engine.
//!
//! Processes digits from most significant to least significant.
//! Recursively sorts each bucket. Only works with non-negative integers.

use super::{recorded_buffer::RecordedBuffer, PregenSort};
use crate::events::{SortEvent, MAIN_ARRAY_ID};

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
        if array.iter().any(|&value| value < 0) || max_val == 0 {
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
        let mut temp = RecordedBuffer::new(1, n, &mut events);
        msd_sort(array, 0, n, max_exp, &mut temp, &mut events);
        temp.remove(&mut events);

        events.push(SortEvent::Done);
        events
    }
}

/// Recursively sort array[lo..hi] by digit at position exp
fn msd_sort(
    array: &mut [i32],
    lo: usize,
    hi: usize,
    exp: i32,
    temp: &mut RecordedBuffer,
    events: &mut Vec<SortEvent>,
) {
    if hi <= lo + 1 || exp == 0 {
        return;
    }

    // Enter range for visualization
    events.push(SortEvent::EnterRange {
        arr_id: MAIN_ARRAY_ID,
        lo,
        hi: hi - 1,
    });

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
    temp.enter_range(hi - lo, events);
    let boundaries = count.clone();
    for i in lo..hi {
        let digit = ((array[i] / exp) % RADIX as i32) as usize;
        temp.copy_from(array, i, count[digit], events);
        count[digit] += 1;
    }

    for idx in 0..(hi - lo) {
        temp.copy_to(array, idx, lo + idx, events);
    }
    temp.exit_range(hi - lo, events);

    // Exit range
    events.push(SortEvent::ExitRange {
        arr_id: MAIN_ARRAY_ID,
        lo,
        hi: hi - 1,
    });

    // Recursively sort each bucket
    if exp / RADIX as i32 > 0 {
        let next_exp = exp / RADIX as i32;

        for d in 0..RADIX {
            let bucket_lo = lo + boundaries[d];
            let bucket_hi = lo + boundaries[d + 1];
            if bucket_hi > bucket_lo + 1 {
                msd_sort(array, bucket_lo, bucket_hi, next_exp, temp, events);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scratch_reuse_handles_shared_prefixes_and_maximum_values() {
        let mut array = [i32::MAX, 0, 101, 109, 101, i32::MAX - 1];
        let events = RadixMsdSort::sort(&mut array);
        assert_eq!(array, [0, 101, 101, 109, i32::MAX - 1, i32::MAX]);
        assert_eq!(
            events
                .iter()
                .filter(|event| matches!(event, SortEvent::AddArray { .. }))
                .count(),
            1
        );
        for mut input in [vec![0, 0], vec![-1, 2], vec![], vec![0]] {
            assert_eq!(RadixMsdSort::sort(&mut input), vec![SortEvent::Done]);
        }
    }

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
}
