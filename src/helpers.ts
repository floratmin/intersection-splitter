/**
 * Definition of all primitive types in JavaScript.
 * @typedef PrimitiveType
 */
export type PrimitiveType = string | boolean | number | bigint | symbol | null | undefined;

export type Arrays<T> = T[][];

export type Sets<T> = Set<Set<T>>;

/**
 * The shape of the returned object by the split function
 * @typedef SetNode
 * @property set - The original set provided to the split function, or the set created during the split operations
 * @property rest - Elements which have no further intersection with any other set.
 * @property imports - The list of `SetNode` which took elements from this `SetNode`.
 * @property depth - The maximum distance of this SetNode to a root node.
 */
export type SetNode<T> = {
    set: Set<T>;
    rest: Set<T>;
    imports: SetNode<T>[];
    depth: number;
};

/**
 * The shape of the returned object by the pull function using arrays
 * @typedef ArrayNode
 * @property array - The original array provided to the split function, or the array created during the split operations
 * @property rest - Elements which have no further intersection with any other `ArrayNode`.
 * @property imports - The list of `ArrayNode` which took elements from this `ArrayNode`.
 * @property depth - The maximum distance of this ArrayNode to a root node.
 */
export type ArrayNode<T> = {
    array: Array<T>;
    rest: Array<T>;
    imports: ArrayNode<T>[];
    depth: number;
};

/**
 * The function which has to be used to define the pulling function in the `LocalizationConfiguration`.
 */
export type SetIntersectionsSplitFunction<T, U extends SetNode<T>> = (sets: Sets<T>) => U[];
export type ArrayIntersectionsSplitFunction<T, U extends ArrayNode<T>> = (arrays: Arrays<T>) => U[];

/**
 * Returns a shallow copy of a set.
 * @param set
 */
export function cloneSet<T>(set: Set<T>) {
    const newSet: Set<T> = new Set();
    set.forEach((entry) => {
        newSet.add(entry);
    });
    return newSet;
}

/**
 * Returns a set from the intersection of the sets
 * @param set1
 * @param set2
 */
export function intersectSets<T>(set1: Set<T>, set2: Set<T>): Set<T> {
    const intersectedSet: Set<T> = new Set();
    const [s1, s2] = set1.size <= set2.size ? [set1, set2] : [set2, set1];
    s1.forEach((element) => {
        if (s2.has(element)) {
            intersectedSet.add(element);
        }
    });
    return intersectedSet;
}

/**
 * Function to add depth to ArrayNodes or SetNodes. Nodes with a depth of 0 are considered as root nodes.
 * @param arrayNodes
 */
export function addMaxDepthToNodes<T, U extends ArrayNode<T> | SetNode<T>>(arrayNodes: U[]): void {
    const importedNodes: U[] = [];
    const unImportedNodes = arrayNodes.filter((arrayNode) => {
        if (arrayNode.depth !== 0) {
            return true;
        }
        importedNodes.push(arrayNode);
        return false;
    });
    unImportedNodes.forEach((arrayNode) => {
        arrayNode.depth = Math.max(...importedNodes.filter((aNode) => aNode.imports
            // @ts-ignore
            .some((iNode: ArrayNode<T> | SetNode<T>) => ('set' in iNode ? iNode.set === arrayNode.set : iNode.array === arrayNode.array)))
            .map((aNode) => aNode.depth)) + 1;
        importedNodes.push(arrayNode);
    });
}

/**
 * Helper function to use sets as input for an ArrayIntersectionSplitFunction.
 * @param sets - The set of sets to split
 * @param arrayIntersectionSplitFunction - The ArrayIntersectionSplitFunction to use
 */
export function convertSetsToArraysAndUseSplitFunction<T, U extends ArrayNode<T>>(
    sets: Sets<T>,
    arrayIntersectionSplitFunction: ArrayIntersectionsSplitFunction<T, U>,
): SetNode<T>[] {
    const { arrays, arrayToSetMap } = mapSetsToArrays(sets);
    const arrayNodes = arrayIntersectionSplitFunction(arrays);
    return mapArraysToSetNodes(arrayNodes, arrayToSetMap);
}

/**
 * Helper function to use arrays as input for an SetIntersectionsSplitFunction
 * @param arrays - The array of arrays to split
 * @param setIntersectionSplitFunction - The SetIntersectionSplitFunction to use
 */
export function convertArraysToSetsAndUseSplitFunction<T, U extends SetNode<T>>(
    arrays: Arrays<T>,
    setIntersectionSplitFunction: SetIntersectionsSplitFunction<T, U>,
): ArrayNode<T>[] {
    const { sets, setToArrayMap } = mapArraysToSets(arrays);
    const setNodes = setIntersectionSplitFunction(sets);
    return mapSetsToArrayNodes(setNodes, setToArrayMap);
}

/**
 * Function to map arrays to sets.
 * @param arrays - The arrays to map to sets.
 */
function mapArraysToSets<T>(arrays: Arrays<T>): {
    arrayToSetMap: Map<Array<T>, Set<T>>;
    setToArrayMap: Map<Set<T>, T[]>;
    sets: Sets<T>;
} {
    const arrayToSetMap: Map<Array<T>, Set<T>> = new Map();
    const sets: Sets<T> = new Set();
    const setToArrayMap = new Map(arrays.map((array) => {
        const set = new Set(array);
        arrayToSetMap.set(array, set);
        sets.add(set);
        return [set, array];
    }));
    return {arrayToSetMap, setToArrayMap, sets};
}

/**
 * Function to map sets to arrays
 * @param sets - The sets to map to arrays.
 */
function mapSetsToArrays<T>(sets: Sets<T>): {
    setToArrayMap: Map<Set<T>, T[]>;
    arrayToSetMap: Map<Array<T>, Set<T>>;
    arrays: Arrays<T>;
} {
    const setToArrayMap: Map<Set<T>, T[]> = new Map();
    const arrays: Arrays<T> = [];
    const arrayToSetMap = new Map([...sets].map((set) => {
        const array = [...set];
        setToArrayMap.set(set, array);
        arrays.push(array);
        return [array, set];
    }));
    return { setToArrayMap, arrayToSetMap, arrays };
}

/**
 * Function to convert SetNodes to ArrayNodes
 * @param setNodes - The SetNodes to convert
 * @param setToArrayMap - The map to get the original reference of the array.
 */
function mapSetsToArrayNodes<T>(setNodes: SetNode<T>[], setToArrayMap: Map<Set<T>, T[]>): ArrayNode<T>[] {
    const arrayNodes: ArrayNode<T>[] = [];
    for (let i = setNodes.length - 1; i >= 0; i--) {
        const setNode = setNodes[i];
        if (!setToArrayMap.has(setNode.set)) {
            setToArrayMap.set(setNode.set, [...setNode.set]);
        }
        const arrayNode: ArrayNode<T> = {
            array: <Array<T>>setToArrayMap.get(setNode.set),
            rest: [...setNode.rest],
            imports: setNode.imports.map((sNode) => <ArrayNode<T>>arrayNodes.find((aNode) => setToArrayMap.get(sNode.set) === aNode.array)),
            depth: setNode.depth,
        };
        arrayNodes.push(arrayNode);
    }
    arrayNodes.reverse();
    return arrayNodes;
}

/**
 * Function to convert ArrayNodes to SetNodes
 * @param arrayNodes - The ArrayNodes to convert
 * @param arrayToSetMap - The map to get the original reference of the set.
 */
function mapArraysToSetNodes<T>(arrayNodes: ArrayNode<T>[], arrayToSetMap: Map<T[], Set<T>>): SetNode<T>[] {
    const setNodes: SetNode<T>[] = [];
    for (let i = arrayNodes.length - 1; i >= 0; i--) {
        const arrayNode = arrayNodes[i];
        if (!arrayToSetMap.has(arrayNode.array)) {
            arrayToSetMap.set(arrayNode.array, new Set(arrayNode.array));
        }
        const setNode: SetNode<T> = {
            set: <Set<T>>arrayToSetMap.get(arrayNode.array),
            rest: new Set(arrayNode.rest),
            imports: arrayNode.imports.map((aNode) => <SetNode<T>>setNodes.find((sNode) => arrayToSetMap.get(aNode.array) === sNode.set)),
            depth: arrayNode.depth,
        };
        setNodes.push(setNode);
    }
    setNodes.reverse();
    return setNodes;
}
