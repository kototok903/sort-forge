//! Cocktail Sort (Bidirectional Bubble Sort) implementation for V1 (Pregeneration) engine.
//!
//! Cocktail sort is a variation of bubble sort that sorts in both directions
//! on each pass through the list. This can be more efficient than bubble sort
//! for certain inputs (e.g., "turtles" - small values at the end).

use crate::events::SortEvent;
use super::PregenSort;

pub struct CocktailSort;

impl PregenSort for CocktailSort {
    fn sort(array: &mut [i32]) -> Vec<SortEvent> {
        let mut events = Vec::new();
        let n = array.len();

        if n <= 1 {
            events.push(SortEvent::Done);
            return events;
        }

        let mut start = 0;
        let mut end = n - 1;
        let mut swapped = true;

        while swapped {
            swapped = false;

            // Forward pass (left to right)
            for i in start..end {
                events.push(SortEvent::Compare { i, j: i + 1 });

                if array[i] > array[i + 1] {
                    events.push(SortEvent::Swap { i, j: i + 1 });
                    array.swap(i, i + 1);
                    swapped = true;
                }
            }

            if !swapped {
                break;
            }

            // Reduce end because the last element is now in place
            end -= 1;
            swapped = false;

            // Backward pass (right to left)
            for i in (start..end).rev() {
                events.push(SortEvent::Compare { i, j: i + 1 });

                if array[i] > array[i + 1] {
                    events.push(SortEvent::Swap { i, j: i + 1 });
                    array.swap(i, i + 1);
                    swapped = true;
                }
            }

            // Increase start because the first element is now in place
            start += 1;
        }

        events.push(SortEvent::Done);
        events
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cocktail_sort_basic() {
        let mut array = vec![5, 3, 8, 4, 2];
        let events = CocktailSort::sort(&mut array);

        assert_eq!(array, vec![2, 3, 4, 5, 8]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_cocktail_sort_already_sorted() {
        let mut array = vec![1, 2, 3, 4, 5];
        let events = CocktailSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
        let swap_count = events.iter().filter(|e| matches!(e, SortEvent::Swap { .. })).count();
        assert_eq!(swap_count, 0);
    }

    #[test]
    fn test_cocktail_sort_reverse() {
        let mut array = vec![5, 4, 3, 2, 1];
        CocktailSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }

    #[test]
    fn test_cocktail_sort_empty() {
        let mut array: Vec<i32> = vec![];
        let events = CocktailSort::sort(&mut array);

        assert!(array.is_empty());
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_cocktail_sort_single() {
        let mut array = vec![42];
        let events = CocktailSort::sort(&mut array);

        assert_eq!(array, vec![42]);
        assert!(matches!(events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_cocktail_sort_turtle_case() {
        // "Turtle" case: small value at end that bubble sort handles poorly
        let mut array = vec![2, 3, 4, 5, 1];
        CocktailSort::sort(&mut array);

        assert_eq!(array, vec![1, 2, 3, 4, 5]);
    }
}
