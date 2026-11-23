# Resumen de Complejidades — Estructuras Fundamentales (Algo2)

| Estructura | Acceso / Búsqueda | Inserción | Eliminación | Observaciones |
| :--- | :---: | :---: | :---: | :--- |
| Pila / Cola | `O(1)` (tope/frente) | `O(1)` | `O(1)` | Operaciones acotadas al extremo |
| Heap Binario | `O(1)` (mínimo/máximo) | `O(log n)` | `O(log n)` | Construcción `heapify` en `O(n)` |
| ABB sin balanceo | `O(n)` peor caso | `O(n)` peor caso | `O(n)` peor caso | Promedio `O(log n)` con claves aleatorias |
| Árbol AVL | `O(log n)` | `O(log n)` | `O(log n)` | Altura garantizada `h = O(log n)` |
| Tabla de Hash | `O(1)` promedio | `O(1)` promedio | `O(1)` promedio | Peor caso `O(n)` sin rehash o colisiones |
