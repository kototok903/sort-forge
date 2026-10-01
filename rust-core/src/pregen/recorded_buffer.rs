//! Fixed-capacity scratch storage with explicit empty slots and recorded transfers.

use crate::events::{ArrayId, ElementRef, ElementValue, SortEvent};

pub(super) struct RecordedBuffer {
    arr_id: ArrayId,
    values: Vec<ElementValue>,
}

impl RecordedBuffer {
    pub(super) fn new(arr_id: ArrayId, length: usize, events: &mut Vec<SortEvent>) -> Self {
        events.push(SortEvent::AddArray { arr_id, length });
        Self {
            arr_id,
            values: vec![None; length],
        }
    }

    pub(super) fn reference(&self, idx: usize) -> ElementRef {
        ElementRef {
            arr_id: self.arr_id,
            idx,
        }
    }

    pub(super) fn value(&self, idx: usize) -> i32 {
        self.values[idx].expect("scratch slot must be initialized before reading")
    }

    pub(super) fn copy_from(
        &mut self,
        array: &[i32],
        src: usize,
        dest: usize,
        events: &mut Vec<SortEvent>,
    ) {
        let value = array[src];
        events.push(SortEvent::Copy {
            src: ElementRef::main(src),
            dest: self.reference(dest),
            old_val: self.values[dest],
            new_val: Some(value),
        });
        self.values[dest] = Some(value);
    }

    pub(super) fn copy_to(
        &self,
        array: &mut [i32],
        src: usize,
        dest: usize,
        events: &mut Vec<SortEvent>,
    ) {
        let value = self.value(src);
        events.push(SortEvent::Copy {
            src: self.reference(src),
            dest: ElementRef::main(dest),
            old_val: Some(array[dest]),
            new_val: Some(value),
        });
        array[dest] = value;
    }

    pub(super) fn enter_range(&self, length: usize, events: &mut Vec<SortEvent>) {
        assert!(length > 0 && length <= self.values.len());
        events.push(SortEvent::EnterRange {
            arr_id: self.arr_id,
            lo: 0,
            hi: length - 1,
        });
    }

    pub(super) fn exit_range(&self, length: usize, events: &mut Vec<SortEvent>) {
        events.push(SortEvent::ExitRange {
            arr_id: self.arr_id,
            lo: 0,
            hi: length - 1,
        });
    }

    pub(super) fn remove(self, events: &mut Vec<SortEvent>) {
        events.push(SortEvent::RemoveArray {
            arr_id: self.arr_id,
        });
    }
}
