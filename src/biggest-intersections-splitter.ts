import {
    addMaxDepthToNodes,
    convertSetsToArraysAndUseSplitFunction,
    ArrayIntersectionsSplitFunction,
    SetIntersectionsSplitFunction,
    SetNode,
    ArrayNode,
    Arrays,
    Sets,
} from './helpers';

/**
 * @typedef ArraySorter - Sort function which can be used in an `Array.prototype.sort()` function.
 */
export type ArraySorter<T> = (value1: T, value2: T) => number;

type IntersectionFunction<T> = (array1: T[], array2: T[]) => T[];

/**
 * Class to pull out intersecting elements of arrays out into their own array by weight functions. This class can create
 * intersections on any type of array of arrays. The method can run, depending on the weight functions and the structure
 * of the arrays faster than the method on `WeightIntersectionsSplitter`.
 */
export class BiggestIntersectionsSplitter<T> {
    private readonly intersectionFunction: IntersectionFunction<T>;

    /**
     * @param sort - When true than `.sort()` is called on each set. When a sort function is provided, than this sort function will
     * be used to sort each set and also for the comparison of equality when getting the intersection between two sets. In both of these cases
     * the an algorithm over sorted arrays is used, which can be substantially faster than the algorithm used when sort is false.
     */
    constructor(private sort: ArraySorter<T> | boolean) {
        if (sort === true) {
            this.intersectionFunction = this.getIntersectionFromOrderedArrays;
        } else if (sort === false) {
            this.intersectionFunction = this.getIntersection;
        } else {
            this.intersectionFunction = this.getIntersectionFromArraysWithOrderingFunction(sort);
        }
    }

    public splitSets: SetIntersectionsSplitFunction<T, SetNode<T>> = (
        sets: Sets<T>,
    ): SetNode<T>[] => convertSetsToArraysAndUseSplitFunction(sets, this.splitArrays);

    public splitArrays: ArrayIntersectionsSplitFunction<T, ArrayNode<T>> = (arrays: Arrays<T>): ArrayNode<T>[] => {
        const arrayNodes: ArrayNode<T>[] = arrays.map((array) => ({
            array,
            rest: this.sort === true
                ? [...array].sort()
                : this.sort === false
                    ? [...array]
                    : [...array].sort(this.sort),
            depth: 0,
            imports: <ArrayNode<T>[]>[],
        }));

        while (this.splitArrayNodes(arrayNodes) > 0) {} // eslint-disable-line no-empty
        addMaxDepthToNodes(arrayNodes);

        return arrayNodes;
    };

    private splitArrayNodes(arrayNodes: ArrayNode<T>[]) {
        const elementCount: Map<T, number> = new Map();
        arrayNodes.forEach(({rest}) => {
            rest.forEach((element) => {
                if (!elementCount.has(element)) {
                    elementCount.set(element, 1);
                } else {
                    elementCount.set(element, <number>elementCount.get(element) + 1);
                }
            });
        });
        const elementCountMap: Map<number, T[]> = new Map();
        elementCount.forEach((count, element) => {
            if (!elementCountMap.has(count)) {
                elementCountMap.set(count, [element]);
            } else {
                (<T[]>elementCountMap.get(count)).push(element);
            }
        });
        const counts = Array.from(elementCountMap.keys()).sort((a, b) => b - a);
        if (counts[0] === 1) {
            return 0;
        }
        const singleElements = <T []>(elementCountMap.get(1) ? elementCountMap.get(1) : []);
        let filteredArrays: ArrayNode<T>[] = arrayNodes.map(
            ({array, rest, imports}) => (
                {
                    array,
                    rest: rest.filter((element) => !singleElements.includes(element)),
                    imports,
                    depth: 0,
                }
            ),
        );
        let longestIntersection:T[] = [];
        let longest = 0;
        const baseArrays: ArrayNode<T>[] = [];
        /* eslint-disable no-restricted-syntax */
        for (const count of counts.slice(0, -1)) {
            const elements = <T []>elementCountMap.get(count);
            for (const element of elements) {
                const nextIntersectedArrays: ArrayNode<T>[] = [];
                const nextFilteredArrays: ArrayNode<T>[] = [];
                for (const filteredArray of filteredArrays) {
                    const { rest } = filteredArray;
                    if (rest.length > longest) {
                        if (rest.includes(element)) {
                            nextIntersectedArrays.push(filteredArray);
                        } else {
                            nextFilteredArrays.push(filteredArray);
                        }
                    }
                }
                const intersection = this.getLongestIntersection(
                    baseArrays.map(({rest}) => rest),
                    nextIntersectedArrays.map(({rest}) => rest),
                    longest,
                );
                if (longest < intersection.length) {
                    longest = intersection.length;
                    longestIntersection = intersection;
                }
                baseArrays.push(...nextIntersectedArrays);
                filteredArrays = nextFilteredArrays;
                if (filteredArrays.length === 0) {
                    if (longestIntersection.length > 0) {
                        const intersectingArrayNode: ArrayNode<T> = {
                            array: longestIntersection,
                            rest: longestIntersection,
                            imports: [],
                            depth: 1,
                        };
                        arrayNodes.forEach((aNode) => { /* eslint-disable-line @typescript-eslint/no-loop-func */
                            if (longestIntersection.every((includedElement) => aNode.rest.includes(includedElement))) {
                                aNode.rest = aNode.rest.filter((el) => !longestIntersection.includes(el));
                                aNode.imports.push(intersectingArrayNode);
                            }
                        });
                        arrayNodes.push(intersectingArrayNode);
                    }
                    return longest;
                }
            }
        }
        return 0;
        /* eslint-enable no-restricted-syntax */
    }

    private getLongestIntersection(baseArrays: Arrays<T>, nextArrays: Arrays<T>, longest: number): T[] {
        const allArrays = [...nextArrays, ...baseArrays];
        let longestIntersection: T[] = [];
        nextArrays.forEach((set, i) => {
            allArrays.slice(i + 1).forEach((all) => {
                const intersection = this.intersectionFunction(set, all);
                if (longest < intersection.length) {
                    longest = intersection.length;
                    longestIntersection = intersection;
                }
            });
        });
        return longestIntersection;
    }

    private getIntersection(array1: T[], array2: T[]): T[] {
        const [a1, a2] = array1.length < array2.length ? [array1, array2] : [array2, array1];
        return a1.filter((element) => a2.includes(element));
    }

    /* eslint-disable no-continue */
    private getIntersectionFromOrderedArrays(array1: T[], array2: T[]): T[] {
        const intersectedArray: Array<T> = [];
        let i = 0;
        let j = 0;
        while (array1.length > i && array2.length > j) {
            const value1 = array1[i];
            const value2 = array2[j];
            if (value1 < value2) {
                i++;
                continue;
            }
            if (value2 < value1) {
                j++;
                continue;
            }
            intersectedArray.push(value1);
            i++;
            j++;
        }
        return intersectedArray;
    }

    private getIntersectionFromArraysWithOrderingFunction(sorter: ArraySorter<T>): IntersectionFunction<T> {
        return function intersectionFunction(array1: T[], array2: T[]): T[] {
            const intersectedArray: Array<T> = [];
            let i = 0;
            let j = 0;
            while (array1.length > i && array2.length > j) {
                const value1 = array1[i];
                const value2 = array2[j];
                const sorting = sorter(value1, value2);
                if (sorting < 0) {
                    i++;
                    continue;
                }
                if (sorting > 0) {
                    j++;
                    continue;
                }
                intersectedArray.push(value1);
                i++;
                j++;
            }
            return intersectedArray;
        };
    }
    /* eslint-enable no-continue */
}
