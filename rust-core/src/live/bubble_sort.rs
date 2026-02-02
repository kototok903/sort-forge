//! Bubble Sort stepper for V2 (Live) engine.

use crate::events::SortEvent;
use super::Stepper;

pub struct BubbleSortStepper {
    i: usize,        // outer loop index
    j: usize,        // inner loop index
    n: usize,        // array length
    swapped: bool,   // track if any swap in current pass
    done: bool,
}

impl BubbleSortStepper {
    pub fn new(len: usize) -> Self {
        Self {
            i: 0,
            j: 0,
            n: len,
            swapped: false,
            done: len <= 1,
        }
    }
}

impl Stepper for BubbleSortStepper {
    fn step(&mut self, arr: &mut [i32], limit: usize) -> Vec<SortEvent> {
        let mut events = Vec::with_capacity(limit);

        while events.len() < limit {
            if self.done {
                if events.is_empty() || !matches!(events.last(), Some(SortEvent::Done)) {
                    events.push(SortEvent::Done);
                }
                break;
            }

            // Compare current pair
            events.push(SortEvent::Compare { i: self.j, j: self.j + 1 });

            if arr[self.j] > arr[self.j + 1] {
                if events.len() < limit {
                    events.push(SortEvent::Swap { i: self.j, j: self.j + 1 });
                    arr.swap(self.j, self.j + 1);
                    self.swapped = true;
                } else {
                    // We've hit the limit, need to do the swap on next step
                    // Revert the compare we just pushed and break
                    events.pop();
                    break;
                }
            }

            // Advance inner loop
            self.j += 1;

            // Check if inner loop complete
            if self.j >= self.n - 1 - self.i {
                if !self.swapped {
                    // No swaps in this pass - array is sorted
                    self.done = true;
                } else {
                    // Start next pass
                    self.i += 1;
                    self.j = 0;
                    self.swapped = false;

                    if self.i >= self.n - 1 {
                        self.done = true;
                    }
                }
            }
        }

        events
    }

    fn is_done(&self) -> bool {
        self.done
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bubble_stepper_sorts_correctly() {
        let mut arr = vec![5, 3, 8, 4, 2];
        let mut stepper = BubbleSortStepper::new(arr.len());

        while !stepper.is_done() {
            stepper.step(&mut arr, 100);
        }

        assert_eq!(arr, vec![2, 3, 4, 5, 8]);
    }

    #[test]
    fn test_bubble_stepper_emits_events() {
        let mut arr = vec![3, 1, 2];
        let mut stepper = BubbleSortStepper::new(arr.len());
        let mut all_events = vec![];

        while !stepper.is_done() {
            let events = stepper.step(&mut arr, 10);
            all_events.extend(events);
        }

        assert!(all_events.iter().any(|e| matches!(e, SortEvent::Compare { .. })));
        assert!(all_events.iter().any(|e| matches!(e, SortEvent::Swap { .. })));
        assert!(matches!(all_events.last(), Some(SortEvent::Done)));
    }

    #[test]
    fn test_bubble_stepper_respects_limit() {
        let mut arr = vec![5, 4, 3, 2, 1];
        let mut stepper = BubbleSortStepper::new(arr.len());

        let events = stepper.step(&mut arr, 3);
        assert!(events.len() <= 3);
        assert!(!stepper.is_done());
    }
}
