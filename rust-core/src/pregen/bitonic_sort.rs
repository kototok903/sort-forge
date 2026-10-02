//! Bitonic Sort implementation for V1 (Pregeneration) engine.
//!
//! Sorts arbitrary lengths directly in the main array, without padding.
//! Uses the arbitrary-length network described by H. W. Lang:
//! https://www.hwlang.de/algorithmen/sortieren/bitonic/oddn.htm

use super::PregenSort;
use crate::events::{ElementRef, SortEvent};

pub struct BitonicSort;

impl PregenSort for BitonicSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        bitonic_sort(array, 0, array.len(), true, &mut events);
        events.push(SortEvent::Done);
        events
    }
}

fn bitonic_sort(
    array: &mut [i32],
    lo: usize,
    len: usize,
    ascending: bool,
    events: &mut Vec<SortEvent>,
) {
    if len <= 1 {
        return;
    }
    let half = len / 2;
    bitonic_sort(array, lo, half, !ascending, events);
    bitonic_sort(array, lo + half, len - half, ascending, events);
    bitonic_merge(array, lo, len, ascending, events);
}

fn bitonic_merge(
    array: &mut [i32],
    lo: usize,
    len: usize,
    ascending: bool,
    events: &mut Vec<SortEvent>,
) {
    if len <= 1 {
        return;
    }
    // Greatest power of two strictly below len, without rounding up/overflow.
    let distance = 1usize << (usize::BITS - 1 - (len - 1).leading_zeros());
    for i in lo..lo + len - distance {
        let j = i + distance;
        events.push(SortEvent::Compare {
            i: ElementRef::main(i),
            j: ElementRef::main(j),
        });
        let should_swap = if ascending {
            array[i] > array[j]
        } else {
            array[i] < array[j]
        };
        if should_swap {
            events.push(SortEvent::Swap {
                i: ElementRef::main(i),
                j: ElementRef::main(j),
            });
            array.swap(i, j);
        }
    }
    bitonic_merge(array, lo, distance, ascending, events);
    bitonic_merge(array, lo + distance, len - distance, ascending, events);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn arbitrary_lengths_replay_without_padding_or_corrections() {
        // Exhaustive binary inputs exercise the sorting network for even,
        // odd, power-of-two, and irregular lengths.
        for n in 0..=10 {
            for bits in 0..(1usize << n) {
                let input: Vec<i32> = (0..n).map(|i| ((bits >> i) & 1) as i32).collect();
                check_replay(&input);
            }
        }
        check_replay(&[i32::MAX, i32::MIN, 0, i32::MAX, -1, 42, i32::MIN]);
        for n in [15, 16, 17, 31, 32, 33, 127, 128, 129] {
            let input: Vec<i32> = (0..n).rev().collect();
            check_replay(&input);
        }
    }

    fn check_replay(input: &[i32]) {
        let mut expected = input.to_vec();
        expected.sort();
        let mut array = input.to_vec();
        let events = BitonicSort::sort(&mut array);
        assert_eq!(array, expected);
        let mut replay = input.to_vec();
        let mut previous_compare = None;
        for event in &events {
            match event {
                SortEvent::Compare { i, j } => {
                    assert_eq!(i.arr_id, 0);
                    assert_eq!(j.arr_id, 0);
                    assert!(i.idx < input.len() && j.idx < input.len());
                    previous_compare = Some((*i, *j));
                }
                SortEvent::Swap { i, j } => {
                    assert_eq!(previous_compare.take(), Some((*i, *j)));
                    assert_ne!(replay[i.idx], replay[j.idx]);
                    replay.swap(i.idx, j.idx);
                }
                SortEvent::Done => {}
                other => panic!("unexpected bitonic event: {other:?}"),
            }
        }
        assert_eq!(replay, expected);
        for event in events.iter().rev() {
            if let SortEvent::Swap { i, j } = event {
                replay.swap(i.idx, j.idx);
            }
        }
        assert_eq!(replay, input);
    }

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

        assert_eq!(
            array,
            vec![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
        );
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
