# Functions to extract intersections between sets into nodes

Functions to extract shared elements out of sets. It returns an array of Nodes where extracted intersections are referenced by the imports of the `Nodes` which 
have the elements of this intersection.

For different usage scenarios there are three different functions:
- `splitIntersectionsShallow` - This splits all elements which are in at least two sets into a new `Node`. This function has a very low complexity. 
- `BiggestIntersectionsSplitter` - The method `splitSets` splits all elements by intersections with most elements first. For this class natural sorting
  of the elements or a sorting function can accelerate the splitting.
- `WeightedIntersectionsSplitter` - The method `splitSets` splits all elements by two weight functions, which are applied on the element count of each
  intersection and on the sets count which have this intersection. The set count may be not accurate when intersections include other intersections, but
  provides a reasonable second weight without increasing the complexity too much. This class needs a bijective mapping from the elements in any array to
  a primitive type.
  
Each of these functions can also be used with an array of arrays. The function `splitIntersectionsShallow` can be used as is, the Classes have the method of
`splitArrays`. These calls will return `ArrayNodes` instead of `SetNodes`.

#### Intersecting shallow
```ts
import { splitIntersectionsShallow, SetNode, GetNodeMetrics } from 'intersection-splitter';

const sets = new Set([
    new Set([1, 2, 3]),
    new Set([2, 3, 4]),
    new Set([3, 4, 5]),
]);

const setNodes: SetNode<number>[] = splitIntersectionsShallow(set);

// This will return
setNodes === [
    {
        set: new Set([1, 2, 3]),
        rest: new Set([1]),
        depth: 0,
        imports: [
            {
                set: new Set([2]),
                rest: new Set([2]),
                depth: 1,
                imports: [],
            }, // === setNodes[3]
            {
                set: new Set([3]),
                rest: new Set([3]),
                depth: 1,
                imports: [],
            }, // === setNodes[4]
        ],
    },
    {
        set: new Set([2, 3, 4]),
        rest: new Set(),
        depth: 0,
        imports: [
            {
                set: new Set([2]),
                rest: new Set([2]),
                depth: 1,
                imports: [],
            }, // === setNodes[3]
            {
                set: new Set([3]),
                rest: new Set([3]),
                depth: 1,
                imports: [],
            }, // === setNodes[4]
            {
                set: new Set([4]),
                rest: new Set([4]),
                depth: 1,
                imports: [],
            }, // === setNodes[5]
        ],
    },
    {
        set: new Set([3, 4, 5]),
        rest: new Set([5]),
        depth: 0,
        imports: [
            {
                set: new Set([3]),
                rest: new Set([3]),
                depth: 1,
                imports: [],
            }, // === setNodes[4]
            {
                set: new Set([4]),
                rest: new Set([4]),
                depth: 1,
                imports: [],
            }, // === setNodes[5]
        ],
    },
    { // #3
        set: new Set([2]),
        rest: new Set([2]),
        depth: 1,
        imports: [],
    },
    { // #4
        set: new Set([3]),
        rest: new Set([3]),
        depth: 1,
        imports: [],
    },
    { // #5
        set: new Set([4]),
        rest: new Set([4]),
        depth: 1,
        imports: [],
    },
]; // true
// get statistics for the generated nodes
const metrics = new GetNodeMetrics().getNodeMetrics(setNodes);

metrics === {
    maxDepth: 1,
    avgMaxDepth: 1,
    avgDepth: 1,
    avgLeaves: 2.3333333333333335,
    avgImports: 2.3333333333333335,
    avgNodes: 3.3333333333333335,
    generatedNodes: 3,
    rootNodes: 3,
    elementsCount: 9,
    uniqueElements: 5,
}; // true

```
#### Intersecting with join/split function and weight functions
```ts
import {
  weightFunctions,
  WeightedIntersectionsSplitter,
  ArrayJoiner,
  PrimitiveSplitter,
  WeightFunction
} from 'intersection-splitter';

const sets = new Set([
  new Set(['1', '2', '3']),
  new Set(['2', '3', '4']),
  new Set(['3', '4', '5']),
]);

const arrayJoiner: ArrayJoiner<string, string> = (array) => array.sort().join('\x00');
const primitiveSplitter: PrimitiveSplitter<string, string> = (string) => string.split('\x00');

// These are the standard weight functions:
const intersectingElementsCount: WeightFunction = (
    {intersectingElementsCount}: {intersectingElementsCount: number}
) => intersectingElementsCount;
const intersectingSetsCount: WeightFunction = (
    {intersectingSetsCount}: {intersectingSetsCount: number}
) => intersectingSetsCount;

const weightedSplitSetNodes = new WeightedIntersectionsSplitter(
        arrayJoiner,
        primitiveSplitter,
        intersectingElementsCount,
        intersectingSetsCount,
).splitSets(sets);

weightedSplitSetNodes === [
  {
    set: new Set(['1', '2', '3']),
    rest: new Set(['1']),
    depth: 0,
    imports: [
      {
        set: new Set(['2', '3']),
        rest: new Set(['2']),
        depth: 1,
        imports: [
          {
            set: new Set(['3']),
            rest: new Set(['3']),
            depth: 2,
            imports: [],
          }, // === setNodes[4]
        ],
      }, // === setNodes[3]
    ],
  },
  {
    set: new Set(['2', '3', '4']),
    rest: new Set(),
    depth: 0,
    imports: [
      {
        set: new Set(['2', '3']),
        rest: new Set(['2']),
        depth: 1,
        imports: [
          {
            set: new Set(['3']),
            rest: new Set(['3']),
            depth: 2,
            imports: [],
          }, // === setNodes[4]
        ],
      }, // === setNodes[3]
      {
        set: new Set(['4']),
        rest: new Set(['4']),
        depth: 1,
        imports: [],
      }, // === setNodes[5]
    ],
  },
  {
    set: new Set(['3', '4', '5']),
    rest: new Set(['5']),
    depth: 0,
    imports: [
      {
        set: new Set(['3']),
        rest: new Set(['3']),
        depth: 2,
        imports: [],
      }, // === setNodes[4]
      {
        set: new Set(['4']),
        rest: new Set(['4']),
        depth: 1,
        imports: [],
      }, // === setNodes[5]
    ],
  },
  { // #3
    set: new Set(['2', '3']),
    rest: new Set(['2']),
    depth: 1,
    imports: [
      {
        set: new Set(['3']),
        rest: new Set(['3']),
        depth: 2,
        imports: [],
      }, // === setNodes[4]
    ],
  },
  { // #4
    set: new Set(['3']),
    rest: new Set(['3']),
    depth: 2,
    imports: [],
  },
  { // #5
    set: new Set(['4']),
    rest: new Set(['4']),
    depth: 1,
    imports: [],
  },
]; // true
```
#### Intersecting arrays containing non primitive elements
```ts
import {
    ArraySorter, 
    BiggestIntersectionsSplitter,
    createSortingMapping,
    createBijectiveMapping,
    WeightedIntersectionsSplitter,
    ArrayJoiner,
    PrimitiveSplitter,
} from 'intersection-splitter';

const a1 = [1], a2 = [1], a3 = [3];

const sets = new Set([
    new Set([a1, a2, a3]),
    new Set([a2, a3]),
    new Set([a3])
]);

const setNodes = new BiggestIntersectionsSplitter(false).splitSets(sets);

setNodes === [
  {
      set: new Set([[1], [1], [3]]),
      rest: new Set([[1]]),
      imports: [
          {
              set: new Set([[1], [3]]),
              rest: new Set([[1]]),
              imports: [
                  {
                      set: new Set([[3]]),
                      rest: new Set([[3]]),
                      imports: [],
                      depth: 2,
                  } // === setNodes[4]
              ],
              depth: 1,
          }, // === setNodes[3]
      ],
      depth: 0,
  },
  {
      set: new Set([[1], [3]]),
      rest: new Set(),
      imports: [
          {
              set: new Set([[1], [3]]),
              rest: new Set([[1]]),
              imports: [
                  {
                      set: new Set([[3]]),
                      rest: new Set([[3]]),
                      imports: [],
                      depth: 2,
                  } // === setNodes[4]
              ],
              depth: 1,
          }, // === setNodes[3]
      ],
      depth: 0,
  },
  {
      set: new Set([[3]]),
      rest: new Set(),
      imports: [
          {
            set: new Set([[3]]),
            rest: new Set([[3]]),
            imports: [],
            depth: 2,
          }, // === setNodes[4]
      ],
      depth: 0,
  },
  { // #3
      set: new Set([[1], [3]]),
      rest: new Set([[1]]),
      imports: [
          {
              set: new Set([[3]]),
              rest: new Set([[3]]),
              imports: [],
              depth: 2,
          } // === setNodes[4]
      ],
      depth: 1,
  },
  { // #4
      set: new Set([[3]]),
      rest: new Set([[3]]),
      imports: [],
      depth: 2,
  },
]; // true
```
