//! QuickSort (LL - Lomuto partition) stepper for V2 (Live) engine.
//!
//! Uses explicit stack instead of recursion for state machine approach.

use crate::events::SortEvent;
use super::Stepper;

/// State of an in-progress partition operation.
struct PartitionState {
    lo: usize,
    hi: usize,
    i: usize,      // partition pointer
    j: usize,      // scan pointer
    pivot: i32,
    entered: bool, // whether we've emitted EnterRange
}

pub struct QuickSortLLStepper {
    stack: Vec<(usize, usize)>,        // pending (lo, hi) ranges
    current: Option<PartitionState>,   // active partition
    done: bool,
}

impl QuickSortLLStepper {
    pub fn new(len: usize) -> Self {
        let mut stepper = Self {
            stack: Vec::new(),
            current: None,
            done: len <= 1,
        };

        if len > 1 {
            stepper.stack.push((0, len - 1));
        }

        stepper
    }

    fn start_partition(&mut self, lo: usize, hi: usize, arr: &[i32]) {
        self.current = Some(PartitionState {
            lo,
            hi,
            i: lo,
            j: lo,
            pivot: arr[hi],
            entered: false,
        });
    }
}

impl Stepper for QuickSortLLStepper {
    fn step(&mut self, arr: &mut [i32], limit: usize) -> Vec<SortEvent> {
        let mut events = Vec::with_capacity(limit);

        for _ in 0..limit {
            if self.done {
                if events.is_empty() || !matches!(events.last(), Some(SortEvent::Done)) {
                    events.push(SortEvent::Done);
                }
                break;
            }

            // If no active partition, start one from stack
            if self.current.is_none() {
                if let Some((lo, hi)) = self.stack.pop() {
                    self.start_partition(lo, hi, arr);
                } else {
                    self.done = true;
                    events.push(SortEvent::Done);
                    break;
                }
            }

            let state = self.current.as_mut().unwrap();

            // Emit EnterRange on first step of partition
            if !state.entered {
                events.push(SortEvent::EnterRange { lo: state.lo, hi: state.hi });
                state.entered = true;
                continue;
            }

            // Partitioning: scan with j
            if state.j < state.hi {
                events.push(SortEvent::Compare { i: state.j, j: state.hi });

                if arr[state.j] <= state.pivot {
                    if state.i != state.j {
                        events.push(SortEvent::Swap { i: state.i, j: state.j });
                        arr.swap(state.i, state.j);
                    }
                    state.i += 1;
                }
                state.j += 1;
            } else {
                // Partition complete - place pivot
                if state.i != state.hi {
                    events.push(SortEvent::Swap { i: state.i, j: state.hi });
                    arr.swap(state.i, state.hi);
                }

                let pivot_idx = state.i;
                let lo = state.lo;
                let hi = state.hi;

                events.push(SortEvent::ExitRange { lo, hi });

                // Push sub-ranges to stack (right first so left is processed first)
                if pivot_idx + 1 < hi {
                    self.stack.push((pivot_idx + 1, hi));
                }
                if pivot_idx > lo {
                    self.stack.push((lo, pivot_idx - 1));
                }

                self.current = None;
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
    fn test_quicksort_stepper_sorts_correctly() {
        let mut arr = vec![5, 3, 8, 4, 2];
        let mut stepper = QuickSortLLStepper::new(arr.len());

        while !stepper.is_done() {
            stepper.step(&mut arr, 100);
        }

        assert_eq!(arr, vec![2, 3, 4, 5, 8]);
    }

    #[test]
    fn test_quicksort_stepper_emits_range_events() {
        let mut arr = vec![3, 1, 4, 1, 5];
        let mut stepper = QuickSortLLStepper::new(arr.len());
        let mut all_events = vec![];

        while !stepper.is_done() {
            let events = stepper.step(&mut arr, 100);
            all_events.extend(events);
        }

        let enter_count = all_events.iter().filter(|e| matches!(e, SortEvent::EnterRange { .. })).count();
        let exit_count = all_events.iter().filter(|e| matches!(e, SortEvent::ExitRange { .. })).count();
        assert_eq!(enter_count, exit_count);
        assert!(enter_count > 0);
    }

    #[test]
    fn test_quicksort_stepper_respects_limit() {
        let mut arr = vec![5, 4, 3, 2, 1];
        let mut stepper = QuickSortLLStepper::new(arr.len());

        let events = stepper.step(&mut arr, 3);
        assert!(events.len() <= 3);
        assert!(!stepper.is_done());
    }

    #[test]
    fn test_quicksort_stepper_handles_duplicates() {
        let mut arr = vec![3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
        let mut stepper = QuickSortLLStepper::new(arr.len());

        while !stepper.is_done() {
            stepper.step(&mut arr, 100);
        }

        assert_eq!(arr, vec![1, 1, 2, 3, 3, 4, 5, 5, 5, 6, 9]);
    }
}
