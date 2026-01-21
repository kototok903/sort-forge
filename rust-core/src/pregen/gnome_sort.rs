//! Gnome Sort implementation for V1 (Pregeneration) engine.
//!
//! Similar to insertion sort but moves elements by swapping adjacent pairs.
//! Named after garden gnomes sorting flower pots.

use crate::events::SortEvent;
use super::PregenSort;

pub struct GnomeSort;

impl PregenSort for GnomeSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        let mut i = 0;

        while i < n {
            if i == 0 {
                i += 1;
            } else {
                events.push(SortEvent::Compare { i: i - 1, j: i });

                if array[i - 1] <= array[i] {
                    // In order, move forward
                    i += 1;
                } else {
                    // Out of order, swap and move back
                    events.push(SortEvent::Swap { i: i - 1, j: i });
                    array.swap(i - 1, i);
                    i -= 1;
                }
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
    fn test_gnome_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = GnomeSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_gnome_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = GnomeSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        let swap_count = events.iter().filter(|e| matches!(e, SortEvent::Swap { .. })).count();
        assert_eq!(swap_count, 0);
    }

    #[test]
    fn test_gnome_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        let events = GnomeSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_gnome_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = GnomeSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_gnome_sort_single() {
        let mut array = vec![42];
        let events = GnomeSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }
}
