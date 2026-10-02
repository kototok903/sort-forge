//! Radix Sort LSD (Least Significant Digit) implementation for V1 (Pregeneration) engine.
//!
//! Processes digits from least significant to most significant.
//! Uses counting sort as a stable subroutine for each digit.
//! Only works with non-negative integers.

use super::{recorded_buffer::RecordedBuffer, PregenSort};
use crate::events::{SortEvent, MAIN_ARRAY_ID};

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

        // OR bounds every nonnegative key without comparing keys. It may
        // require one extra decimal pass. A negative key sets the sign bit.
        let digit_bound = array.iter().fold(0, |bits, &value| bits | value);
        if digit_bound <= 0 {
            // Radix sort LSD only works with non-negative integers
            events.push(SortEvent::Done);
            return events;
        }

        let mut output = RecordedBuffer::new(1, n, &mut events);

        // Process each digit position
        let mut exp = 1;
        while digit_bound / exp > 0 {
            counting_sort_by_digit(array, exp, &mut output, &mut events);
            if digit_bound / exp < RADIX {
                break;
            }
            exp *= RADIX;
        }

        output.remove(&mut events);
        events.push(SortEvent::Done);
        events
    }
}

/// Counting sort based on digit at position exp (1, 10, 100, ...)
fn counting_sort_by_digit(
    array: &mut [i32],
    exp: i32,
    output: &mut RecordedBuffer,
    events: &mut Vec<SortEvent>,
) {
    let n = array.len();
    events.push(SortEvent::EnterRange {
        arr_id: MAIN_ARRAY_ID,
        lo: 0,
        hi: n - 1,
    });
    output.enter_range(n, events);
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
        output.copy_from(array, i, new_pos, events);
    }

    for idx in 0..n {
        output.copy_to(array, idx, idx, events);
    }
    output.consume(events);
    output.exit_range(n, events);
    events.push(SortEvent::ExitRange {
        arr_id: MAIN_ARRAY_ID,
        lo: 0,
        hi: n - 1,
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maximum_digit_exponent_does_not_overflow() {
        let mut array = [i32::MAX, 0, 10, i32::MAX - 1, 10];
        let events = RadixLsdSort::sort(&mut array);
        assert_eq!(array, [0, 10, 10, i32::MAX - 1, i32::MAX]);
        assert_eq!(
            events
                .iter()
                .filter(|event| matches!(event, SortEvent::AddArray { .. }))
                .count(),
            1
        );
        for mut input in [vec![0, 0], vec![-1, 2], vec![], vec![0]] {
            assert_eq!(RadixLsdSort::sort(&mut input), vec![SortEvent::Done]);
        }
    }

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
    fn test_radix_sort_lsd_uses_copies() {
        let mut array = vec![30, 20, 10];
        let events = RadixLsdSort::sort(&mut array);

        // Each transfer identifies its source
        let copy_count = events
            .iter()
            .filter(|e| matches!(e, SortEvent::Copy { .. }))
            .count();
        assert!(copy_count > 0);
    }
}
