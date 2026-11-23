"""Práctica resuelta de Heap Binario (Min-Heap) para Algo2."""


class MinHeap:
    """Cola de prioridad mínima implementada sobre arreglo 0-indexado."""

    def __init__(self, items=None):
        self._data = list(items) if items else []
        if self._data:
            for i in range(len(self._data) // 2 - 1, -1, -1):
                self._downheap(i)

    def __len__(self) -> int:
        return len(self._data)

    def peek(self):
        if not self._data:
            raise IndexError("Heap vacío")
        return self._data[0]

    def push(self, value) -> None:
        self._data.append(value)
        self._upheap(len(self._data) - 1)

    def pop(self):
        if not self._data:
            raise IndexError("Heap vacío")
        top = self._data[0]
        last = self._data.pop()
        if self._data:
            self._data[0] = last
            self._downheap(0)
        return top

    def _upheap(self, idx: int) -> None:
        while idx > 0:
            parent = (idx - 1) // 2
            if self._data[idx] < self._data[parent]:
                self._data[idx], self._data[parent] = self._data[parent], self._data[idx]
                idx = parent
            else:
                break

    def _downheap(self, idx: int) -> None:
        n = len(self._data)
        while True:
            smallest = idx
            left = 2 * idx + 1
            right = 2 * idx + 2
            if left < n and self._data[left] < self._data[smallest]:
                smallest = left
            if right < n and self._data[right] < self._data[smallest]:
                smallest = right
            if smallest == idx:
                break
            self._data[idx], self._data[smallest] = self._data[smallest], self._data[idx]
            idx = smallest


if __name__ == "__main__":
    heap = MinHeap([9, 4, 7, 1, 3, 6])
    assert heap.peek() == 1
    assert [heap.pop() for _ in range(6)] == [1, 3, 4, 6, 7, 9]
    heap.push(10)
    heap.push(2)
    assert heap.pop() == 2
    assert heap.pop() == 10
    print("OK: MinHeap verificado")
