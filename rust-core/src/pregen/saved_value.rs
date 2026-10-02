//! Reusable single-item array to be used as a saved value (e.g., in Insertion Sort iterations).

use crate::events::{ArrayId, ElementRef, SortEvent};

pub(super) struct SavedValue {
    arr_id: ArrayId,
    value: Option<i32>,
}

impl SavedValue {
    pub(super) fn new(arr_id: ArrayId, events: &mut Vec<SortEvent>) -> Self {
        events.push(SortEvent::AddArray { arr_id, length: 1 });
        Self {
            arr_id,
            value: None,
        }
    }

    pub(super) fn reference(&self) -> ElementRef {
        ElementRef {
            arr_id: self.arr_id,
            idx: 0,
        }
    }

    pub(super) fn value(&self) -> i32 {
        self.value
            .expect("saved value must be initialized before reading")
    }

    pub(super) fn save_from(
        &mut self,
        array: &[i32],
        idx: usize,
        events: &mut Vec<SortEvent>,
    ) -> i32 {
        let value = array[idx];
        events.push(SortEvent::Copy {
            src: ElementRef::main(idx),
            dest: self.reference(),
            old_val: self.value,
            new_val: Some(value),
        });
        self.value = Some(value);
        value
    }

    pub(super) fn write_to(&self, array: &mut [i32], idx: usize, events: &mut Vec<SortEvent>) {
        let value = self.value();
        events.push(SortEvent::Copy {
            src: self.reference(),
            dest: ElementRef::main(idx),
            old_val: Some(array[idx]),
            new_val: Some(value),
        });
        array[idx] = value;
    }

    pub(super) fn swap_with(&mut self, array: &mut [i32], idx: usize, events: &mut Vec<SortEvent>) {
        let reference = self.reference();
        let value = self
            .value
            .as_mut()
            .expect("saved value must be initialized before swapping");
        events.push(SortEvent::Swap {
            i: reference,
            j: ElementRef::main(idx),
        });
        std::mem::swap(value, &mut array[idx]);
    }

    pub(super) fn consume(&mut self, events: &mut Vec<SortEvent>) {
        events.push(SortEvent::ConsumeArray {
            arr_id: self.arr_id,
        });
    }

    pub(super) fn remove(self, events: &mut Vec<SortEvent>) {
        events.push(SortEvent::RemoveArray {
            arr_id: self.arr_id,
        });
    }
}
