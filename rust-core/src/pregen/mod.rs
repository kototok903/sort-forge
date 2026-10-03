//! V1 Engine: Pregeneration sorting algorithms.
//!
//! These are standard, recursive implementations that run to completion
//! and collect all events into a vector. Optimized for simplicity and
//! timeline scrubbing, but uses O(N²) memory for events.

mod recorded_buffer;
mod saved_value;

pub mod binary_insertion_sort;
pub mod bitonic_sort;
pub mod bubble_sort;
pub mod cocktail_sort;
pub mod comb_sort;
pub mod cycle_sort;
pub mod gnome_sort;
pub mod heap_sort;
pub mod insertion_sort;
pub mod introsort;
pub mod merge_sort;
pub mod merge_sort_half_buffer;
pub mod odd_even_sort;
pub mod pancake_sort;
pub mod quicksort_ll;
pub mod quicksort_lr;
pub mod radix_lsd_sort;
pub mod radix_msd_sort;
pub mod selection_sort;
pub mod shell_sort;
pub mod stooge_sort;
pub mod timsort;

use crate::events::SortEvent;

/// Trait for pregeneration sorting algorithms.
/// Algorithms run to completion and return all events.
pub trait PregenSort {
    /// Optional input limit for algorithms with expensive pregeneration.
    const MAX_ARRAY_SIZE: Option<usize> = None;

    /// Sort the array and return all events that occurred.
    /// The array is modified in place.
    fn sort(array: &mut [i32]) -> Vec<SortEvent>;
}

/// Available sorting algorithms for V1 engine.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Algorithm {
    Bubble,
    Selection,
    Insertion,
    BinaryInsertion,
    Cocktail,
    OddEven,
    Gnome,
    Pancake,
    Shell,
    Comb,
    Cycle,
    Stooge,
    QuickSortLL,
    QuickSortLR,
    MergeSort,
    MergeSortHalfBuffer,
    HeapSort,
    Timsort,
    IntroSort,
    RadixLsd,
    RadixMsd,
    Bitonic,
}

impl Algorithm {
    pub fn as_str(&self) -> &'static str {
        match self {
            Algorithm::Bubble => "bubble",
            Algorithm::Selection => "selection",
            Algorithm::Insertion => "insertion",
            Algorithm::BinaryInsertion => "binary_insertion",
            Algorithm::Cocktail => "cocktail",
            Algorithm::OddEven => "odd_even",
            Algorithm::Gnome => "gnome",
            Algorithm::Pancake => "pancake",
            Algorithm::Shell => "shell",
            Algorithm::Comb => "comb",
            Algorithm::Cycle => "cycle",
            Algorithm::Stooge => "stooge",
            Algorithm::QuickSortLL => "quicksort_ll",
            Algorithm::QuickSortLR => "quicksort_lr",
            Algorithm::MergeSort => "merge",
            Algorithm::MergeSortHalfBuffer => "merge_half_buffer",
            Algorithm::HeapSort => "heap",
            Algorithm::Timsort => "timsort",
            Algorithm::IntroSort => "introsort",
            Algorithm::RadixLsd => "radix_lsd",
            Algorithm::RadixMsd => "radix_msd",
            Algorithm::Bitonic => "bitonic",
        }
    }

    /// Input limit declared by the algorithm implementation.
    pub fn max_array_size(&self) -> Option<usize> {
        match self {
            Algorithm::Bubble => bubble_sort::BubbleSort::MAX_ARRAY_SIZE,
            Algorithm::Selection => selection_sort::SelectionSort::MAX_ARRAY_SIZE,
            Algorithm::Insertion => insertion_sort::InsertionSort::MAX_ARRAY_SIZE,
            Algorithm::BinaryInsertion => binary_insertion_sort::BinaryInsertionSort::MAX_ARRAY_SIZE,
            Algorithm::Cocktail => cocktail_sort::CocktailSort::MAX_ARRAY_SIZE,
            Algorithm::OddEven => odd_even_sort::OddEvenSort::MAX_ARRAY_SIZE,
            Algorithm::Gnome => gnome_sort::GnomeSort::MAX_ARRAY_SIZE,
            Algorithm::Pancake => pancake_sort::PancakeSort::MAX_ARRAY_SIZE,
            Algorithm::Shell => shell_sort::ShellSort::MAX_ARRAY_SIZE,
            Algorithm::Comb => comb_sort::CombSort::MAX_ARRAY_SIZE,
            Algorithm::Cycle => cycle_sort::CycleSort::MAX_ARRAY_SIZE,
            Algorithm::Stooge => stooge_sort::StoogeSort::MAX_ARRAY_SIZE,
            Algorithm::QuickSortLL => quicksort_ll::QuickSortLL::MAX_ARRAY_SIZE,
            Algorithm::QuickSortLR => quicksort_lr::QuickSortLR::MAX_ARRAY_SIZE,
            Algorithm::MergeSort => merge_sort::MergeSort::MAX_ARRAY_SIZE,
            Algorithm::MergeSortHalfBuffer => merge_sort_half_buffer::MergeSortHalfBuffer::MAX_ARRAY_SIZE,
            Algorithm::HeapSort => heap_sort::HeapSort::MAX_ARRAY_SIZE,
            Algorithm::Timsort => timsort::Timsort::MAX_ARRAY_SIZE,
            Algorithm::IntroSort => introsort::Introsort::MAX_ARRAY_SIZE,
            Algorithm::RadixLsd => radix_lsd_sort::RadixLsdSort::MAX_ARRAY_SIZE,
            Algorithm::RadixMsd => radix_msd_sort::RadixMsdSort::MAX_ARRAY_SIZE,
            Algorithm::Bitonic => bitonic_sort::BitonicSort::MAX_ARRAY_SIZE,
        }
    }

    pub fn validate_array_size(&self, size: usize) -> Result<(), String> {
        if let Some(max) = self.max_array_size() {
            if size > max {
                return Err(format!(
                    "{} supports at most {} elements (received {})",
                    self.as_str(), max, size
                ));
            }
        }
        Ok(())
    }

    pub fn all() -> &'static [Algorithm] {
        const ALGORITHMS: [Algorithm; 22] = [
            Algorithm::Bubble,
            Algorithm::Selection,
            Algorithm::Insertion,
            Algorithm::BinaryInsertion,
            Algorithm::Cocktail,
            Algorithm::OddEven,
            Algorithm::Gnome,
            Algorithm::Pancake,
            Algorithm::Shell,
            Algorithm::Comb,
            Algorithm::Cycle,
            Algorithm::Stooge,
            Algorithm::QuickSortLL,
            Algorithm::QuickSortLR,
            Algorithm::MergeSort,
            Algorithm::MergeSortHalfBuffer,
            Algorithm::HeapSort,
            Algorithm::Timsort,
            Algorithm::IntroSort,
            Algorithm::RadixLsd,
            Algorithm::RadixMsd,
            Algorithm::Bitonic,
        ];
        &ALGORITHMS
    }

    /// Parse algorithm name from string.
    pub fn from_str(s: &str) -> Option<Algorithm> {
        match s.to_lowercase().as_str() {
            "bubble" | "bubblesort" | "bubble_sort" => Some(Algorithm::Bubble),
            "selection" | "selectionsort" | "selection_sort" => Some(Algorithm::Selection),
            "insertion" | "insertionsort" | "insertion_sort" => Some(Algorithm::Insertion),
            "binary_insertion" | "binaryinsertion" | "binary_insertion_sort" => {
                Some(Algorithm::BinaryInsertion)
            }
            "cocktail" | "cocktailsort" | "cocktail_sort" => Some(Algorithm::Cocktail),
            "odd_even" | "oddeven" | "odd_even_sort" => Some(Algorithm::OddEven),
            "gnome" | "gnomesort" | "gnome_sort" => Some(Algorithm::Gnome),
            "pancake" | "pancakesort" | "pancake_sort" => Some(Algorithm::Pancake),
            "shell" | "shellsort" | "shell_sort" => Some(Algorithm::Shell),
            "comb" | "combsort" | "comb_sort" => Some(Algorithm::Comb),
            "cycle" | "cyclesort" | "cycle_sort" => Some(Algorithm::Cycle),
            "stooge" | "stoogesort" | "stooge_sort" => Some(Algorithm::Stooge),
            "quicksort_ll" | "quicksortll" | "quick_sort_ll" => Some(Algorithm::QuickSortLL),
            "quicksort_lr" | "quicksortlr" | "quick_sort_lr" => Some(Algorithm::QuickSortLR),
            "merge" | "mergesort" | "merge_sort" => Some(Algorithm::MergeSort),
            "merge_half_buffer" | "merge_sort_half_buffer" => Some(Algorithm::MergeSortHalfBuffer),
            "heap" | "heapsort" | "heap_sort" => Some(Algorithm::HeapSort),
            "tim" | "timsort" | "tim_sort" => Some(Algorithm::Timsort),
            "intro" | "introsort" | "intro_sort" => Some(Algorithm::IntroSort),
            "radix_lsd" | "radixlsd" | "radix_lsd_sort" => Some(Algorithm::RadixLsd),
            "radix_msd" | "radixmsd" | "radix_msd_sort" => Some(Algorithm::RadixMsd),
            "bitonic" | "bitonicsort" | "bitonic_sort" => Some(Algorithm::Bitonic),
            _ => None,
        }
    }
}

/// Run a pregeneration sort on the given array.
/// Returns the sorted array and all events.
pub fn pregen_sort(algorithm: Algorithm, array: &mut [i32]) -> Vec<SortEvent> {
    match algorithm {
        Algorithm::Bubble => bubble_sort::BubbleSort::sort(array),
        Algorithm::Selection => selection_sort::SelectionSort::sort(array),
        Algorithm::Insertion => insertion_sort::InsertionSort::sort(array),
        Algorithm::BinaryInsertion => binary_insertion_sort::BinaryInsertionSort::sort(array),
        Algorithm::Cocktail => cocktail_sort::CocktailSort::sort(array),
        Algorithm::OddEven => odd_even_sort::OddEvenSort::sort(array),
        Algorithm::Gnome => gnome_sort::GnomeSort::sort(array),
        Algorithm::Pancake => pancake_sort::PancakeSort::sort(array),
        Algorithm::Shell => shell_sort::ShellSort::sort(array),
        Algorithm::Comb => comb_sort::CombSort::sort(array),
        Algorithm::Cycle => cycle_sort::CycleSort::sort(array),
        Algorithm::Stooge => stooge_sort::StoogeSort::sort(array),
        Algorithm::QuickSortLL => quicksort_ll::QuickSortLL::sort(array),
        Algorithm::QuickSortLR => quicksort_lr::QuickSortLR::sort(array),
        Algorithm::MergeSort => merge_sort::MergeSort::sort(array),
        Algorithm::MergeSortHalfBuffer => merge_sort_half_buffer::MergeSortHalfBuffer::sort(array),
        Algorithm::HeapSort => heap_sort::HeapSort::sort(array),
        Algorithm::Timsort => timsort::Timsort::sort(array),
        Algorithm::IntroSort => introsort::Introsort::sort(array),
        Algorithm::RadixLsd => radix_lsd_sort::RadixLsdSort::sort(array),
        Algorithm::RadixMsd => radix_msd_sort::RadixMsdSort::sort(array),
        Algorithm::Bitonic => bitonic_sort::BitonicSort::sort(array),
    }
}
