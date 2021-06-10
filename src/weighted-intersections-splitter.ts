import {
    cloneSet,
    intersectSets,
    convertArraysToSetsAndUseSplitFunction,
    PrimitiveType,
    SetIntersectionsSplitFunction,
    ArrayIntersectionsSplitFunction,
    ArrayNode,
    SetNode,
    Arrays,
    Sets,
} from './helpers';

/**
 * @typedef ArrayJoiner - Bijective function to map the elements of each array to a primitive type.
 */
export type ArrayJoiner<T, U extends PrimitiveType> = (array: T[]) => U;

/**
 * @typedef PrimitiveSplitter - Inverse function to `ArrayJoiner`.
 */
export type PrimitiveSplitter<T, U extends PrimitiveType> = (primitive: U) => T[];

/**
 * The weight function to be used for the construction of the `IntersectionByWeight` class. The intersectingSetsCount is not accurate when there are
 * intersections which are subsets of other intersections and will therefore mostly not find the optimal solution to this strategy. The correct implementation
 * slows the execution time too much down.
 */
export type WeightFunction = ({intersectingElementsCount, intersectingSetsCount}: {intersectingElementsCount: number, intersectingSetsCount: number}) => number;

/**
 * Some simple weight functions for convenience.
 */
export const weightFunctions: {
    elementsCount: WeightFunction,
    setsCount: WeightFunction,
    productSetsElementsCount: WeightFunction,
    elementsCountReverse: WeightFunction,
    setsCountReverse: WeightFunction,
    productSetsElementsCountReverse: WeightFunction,
} = {
    elementsCount: ({intersectingElementsCount}) => intersectingElementsCount,
    setsCount: ({intersectingSetsCount}) => intersectingSetsCount,
    productSetsElementsCount: ({intersectingElementsCount, intersectingSetsCount}) => intersectingElementsCount * intersectingSetsCount,
    elementsCountReverse: ({intersectingElementsCount}) => -intersectingElementsCount,
    setsCountReverse: ({intersectingSetsCount}) => -intersectingSetsCount,
    productSetsElementsCountReverse: (
        {intersectingElementsCount, intersectingSetsCount},
    ) => -intersectingElementsCount * intersectingSetsCount,
};

type IntersectionMap<T, U extends PrimitiveType> = Map<U, [Set<T>, Set<T>][]>;

type IntersectionMapSet<T, U extends PrimitiveType> = Map<U, Map<Set<T>, number>>;

type SetToIntersectionMap<T, U extends PrimitiveType> = Map<Set<T>, Set<U>>;

type WeightIntersectionMap <U extends PrimitiveType> = Map<number, Set<U>>;

/**
 * Class to pull out intersecting elements of sets out into their own set by weight functions. This class keeps record of all intersections and
 * therefore can behave not optimal regarding execution time and memory usage in certain scenarios. This function relies heavily on side effects.
 * Especially the object in `SetObj.rest` and `set` in various objects is the same. The original sets are not touched by this class and a reference to each
 * set is stored in `SetObj.set`. This function needs an bijective mapping between the elements of each set and a `PrimitiveType`.
 */
export class WeightedIntersectionsSplitter<T, U extends PrimitiveType> {
    /**
     * @param join - The bijective function used internally to map the elements of a set to a primitive type.
     * @param split - The inverse function to joiner. It maps primitive types to the elements in a set.
     * @param primaryWeight - The primary weight function, default is the number of elements in the set.
     * @param secondaryWeight - The secondary weight function to use when the primary weight function results in a maximum for more than one set.
     * Default is the number of sets which include the intersection.
     */
    constructor(
        private join: ArrayJoiner<T, U>,
        private split: PrimitiveSplitter<T, U>,
        private primaryWeight: WeightFunction = weightFunctions.elementsCount,
        private secondaryWeight: WeightFunction = weightFunctions.setsCount,
    ) {}

    /**
     * `SplitFunction` to pull out the intersecting elements.
     * @param sets - The set of sets.
     */
    public splitSets: SetIntersectionsSplitFunction<T, SetNode<T>> = (
        sets: Sets<T>,
    ): SetNode<T>[] => {
        const { setNodeMap, clonedSets } = this.createSetObjMap(sets);
        const intersectionMap = this.createIntersectionMap(clonedSets);
        const intersectionMapSet = this.createIntersectionMapSet(intersectionMap);
        const setToIntersectionMap = this.createSetToIntersectionMap(intersectionMapSet);
        const weightIntersectionsMap = this.getWeightIntersectionsMap(intersectionMapSet);
        while (intersectionMap.size > 0) {
            const {highestWeightIntersection, highestWeight} = this.getHighestWeightIntersection(weightIntersectionsMap, intersectionMapSet);
            const intersectingSets: Sets<T> = new Set((<Map<Set<T>, number>>intersectionMapSet.get(highestWeightIntersection)).keys());
            const {otherAffectedIntersections, otherAffectedSets} = this.getOtherAffectedIntersections(
                intersectingSets, setToIntersectionMap, highestWeightIntersection, intersectionMapSet,
            );
            const intersectingPairs = this.removeUpdatedFromMaps(
                highestWeightIntersection,
                intersectingSets,
                otherAffectedIntersections,
                otherAffectedSets,
                intersectionMap,
                intersectionMapSet,
                setToIntersectionMap,
                weightIntersectionsMap,
                highestWeight,
            );
            let depth = 1;
            const newIntersectingObj = <SetNode<T>>{
                set: new Set(this.split(highestWeightIntersection)),
                rest: new Set(this.split(highestWeightIntersection)),
                depth,
                imports: [],
            };
            intersectingSets.forEach((set) => {
                const setNode = <SetNode<T>>setNodeMap.get(set);
                if (setNode.depth >= depth) {
                    depth = setNode.depth + 1;
                }
                // The filter function removes as a side effect also from `set` in all objects which have a reference to `setNode.rest`!
                this.filterFromSet(setNode.rest, (element) => !newIntersectingObj.set.has(element));
                setNode.imports.push(newIntersectingObj);
            });
            const highestWeightIntersectionElements = this.split(highestWeightIntersection);
            otherAffectedSets.forEach((set) => {
                if (highestWeightIntersectionElements.every((element) => set.has(element))) {
                    depth = this.updateSetObj(set, setNodeMap, newIntersectingObj, depth);
                }
            });
            newIntersectingObj.depth = depth;
            this.addUpdatedToMaps(
                newIntersectingObj.rest, clonedSets, intersectingPairs, intersectionMap, intersectionMapSet, setToIntersectionMap, weightIntersectionsMap,
            );
            clonedSets.add(newIntersectingObj.rest);
            setNodeMap.set(newIntersectingObj.rest, newIntersectingObj);
        }
        return Array.from(setNodeMap.values());
    };

    public splitArrays: ArrayIntersectionsSplitFunction<T, ArrayNode<T>> = (
        arrays: Arrays<T>,
    ): ArrayNode<T>[] => convertArraysToSetsAndUseSplitFunction(arrays, this.splitSets);

    private createSetObjMap(sets: Sets<T>): {setNodeMap: Map<Set<T>, SetNode<T>>, clonedSets: Sets<T>} {
        const setNodeMap: Map<Set<T>, SetNode<T>> = new Map();
        const clonedSets: Sets<T> = new Set();
        sets.forEach((set) => {
            const clonedSet = cloneSet(set);
            clonedSets.add(clonedSet);
            setNodeMap.set(clonedSet, {
                set, rest: clonedSet, depth: 0, imports: [],
            });
        });
        return {setNodeMap, clonedSets};
    }

    private createIntersectionMap(sets: Sets<T>) : IntersectionMap<T, U> {
        const intersectionMap: IntersectionMap<T, U> = new Map();
        const orderedSets = [...sets];
        orderedSets.forEach((set1, i) => {
            orderedSets.slice(i + 1).forEach((set2) => {
                const intersectedSet = intersectSets(set1, set2);
                if (intersectedSet.size > 0) {
                    const intersectionId = this.join([...intersectedSet]);
                    const intersectionMapEntry = intersectionMap.get(intersectionId);
                    if (intersectionMapEntry) {
                        intersectionMapEntry.push([set1, set2]);
                    } else {
                        intersectionMap.set(intersectionId, [[set1, set2]]);
                    }
                }
            });
        });
        return intersectionMap;
    }

    private createIntersectionMapSet(intersectionMap: IntersectionMap<T, U>): IntersectionMapSet<T, U> {
        const intersectionMapSet: IntersectionMapSet<T, U> = new Map();
        intersectionMap.forEach((sets, key) => {
            const setsMap: Map<Set<T>, number> = new Map();
            sets.forEach(([set1, set2]) => {
                let nextSet = setsMap.get(set1);
                if (nextSet) {
                    setsMap.set(set1, nextSet + 1);
                } else {
                    setsMap.set(set1, 1);
                }
                nextSet = setsMap.get(set2);
                if (nextSet) {
                    setsMap.set(set2, nextSet + 1);
                } else {
                    setsMap.set(set2, 1);
                }
            });
            intersectionMapSet.set(key, setsMap);
        });
        return intersectionMapSet;
    }

    private createSetToIntersectionMap(
        intersectionMapSet: IntersectionMapSet<T, U>,
        setToIntersectionMap: SetToIntersectionMap<T, U> = new Map(),
    ): SetToIntersectionMap<T, U> {
        intersectionMapSet.forEach((setMap, intersection) => {
            setMap.forEach((_, set) => {
                const intersections = setToIntersectionMap.get(set);
                if (!intersections) {
                    setToIntersectionMap.set(set, new Set([intersection]));
                } else {
                    intersections.add(intersection);
                }
            });
        });
        return setToIntersectionMap;
    }

    private getWeightIntersectionsMap(intersectionMapSet: IntersectionMapSet<T, U>): WeightIntersectionMap<U> {
        const weightIntersectionMap: WeightIntersectionMap<U> = new Map();
        intersectionMapSet.forEach((mapSet, intersection) => {
            const intersectingElementsCount = this.split(intersection).length;
            const intersectingSetsCount = mapSet.size;
            const weight = this.primaryWeight({intersectingElementsCount, intersectingSetsCount});
            const intersections = weightIntersectionMap.get(weight);
            if (!intersections) {
                weightIntersectionMap.set(weight, new Set([intersection]));
            } else {
                intersections.add(intersection);
            }
        });
        return weightIntersectionMap;
    }

    private getHighestWeightIntersection(
        weightIntersectionsMap: WeightIntersectionMap<U>,
        intersectionMapSet: IntersectionMapSet<T, U>,
    ): {highestWeightIntersection: U, highestWeight: number} {
        const highestWeight = Math.max(...Array.from(weightIntersectionsMap.keys()));
        const maxWeightIntersections = <Set<U>>weightIntersectionsMap.get(highestWeight);
        let maxSecondaryWeight = -Infinity;
        let highestWeightIntersection: U = maxWeightIntersections.keys().next().value;
        if (maxWeightIntersections.size > 1) {
            maxWeightIntersections.forEach((intersection) => {
                const intersectingElementsCount = this.split(intersection).length;
                const intersectingSetsCount = (<Map<Set<T>, number>>intersectionMapSet.get(intersection)).size;
                const secondaryWeight = this.secondaryWeight({intersectingElementsCount, intersectingSetsCount});
                if (secondaryWeight > maxSecondaryWeight) {
                    [maxSecondaryWeight, highestWeightIntersection] = [secondaryWeight, intersection];
                }
            });
            return {highestWeightIntersection, highestWeight};
        }
        return {highestWeightIntersection, highestWeight};
    }

    private getOtherAffectedIntersections(
        intersectingSets: Sets<T>,
        setToIntersectionMap: SetToIntersectionMap<T, U>,
        highestWeightIntersection: U,
        intersectionMapSet: IntersectionMapSet<T, U>,
    ): {otherAffectedIntersections: Set<U>, otherAffectedSets: Sets<T>} {
        const otherAffectedIntersections: Set<U> = new Set();
        const highestWeightedIntersectionElements = this.split(highestWeightIntersection);
        const otherAffectedSets: Sets<T> = new Set();
        intersectingSets.forEach((set) => {
            const affectedIntersections = <Set<U>>setToIntersectionMap.get(set);
            affectedIntersections.forEach((intersection) => {
                if (this.split(intersection).some((element) => highestWeightedIntersectionElements.includes(element))) {
                    otherAffectedIntersections.add(intersection);
                    const affectedSets = new Set((<Map<Set<T>, number>>intersectionMapSet.get(intersection)).keys());
                    affectedSets.forEach((affectedSet) => {
                        if (!intersectingSets.has(affectedSet)) {
                            otherAffectedSets.add(affectedSet);
                        }
                    });
                }
            });
        });
        otherAffectedIntersections.delete(highestWeightIntersection);
        return { otherAffectedIntersections, otherAffectedSets};
    }

    private removeUpdatedFromMaps(
        highestWeightIntersection: U,
        intersectingSets: Sets<T>,
        otherAffectedIntersections: Set<U>,
        otherAffectedSets: Sets<T>,
        intersectionMap: IntersectionMap<T, U>,
        intersectionMapSet: IntersectionMapSet<T, U>,
        setToIntersectionMap: SetToIntersectionMap<T, U>,
        weightIntersectionMap: WeightIntersectionMap<U>,
        highestWeight: number,
    ): [Set<T>, Set<T>][] {
        intersectionMap.delete(highestWeightIntersection);
        intersectionMapSet.delete(highestWeightIntersection);
        intersectingSets.forEach((intersectingSet) => {
            this.removeFromSetOrDeleteFromMap(setToIntersectionMap, intersectingSet, highestWeightIntersection);
        });
        this.removeFromSetOrDeleteFromMap(weightIntersectionMap, highestWeight, highestWeightIntersection);
        const intersectingPairs: [Set<T>, Set<T>][] = [];
        otherAffectedIntersections.forEach((otherAffectedIntersection) => {
            const possiblyAffectedIntersectingSets = <[Set<T>, Set<T>][]>intersectionMap.get(otherAffectedIntersection);
            const unaffectedIntersectingSets = possiblyAffectedIntersectingSets.filter(([set1, set2]) => {
                if (intersectingSets.has(set1) || intersectingSets.has(set2) || (otherAffectedSets.has(set1) && otherAffectedSets.has(set2))) {
                    intersectingPairs.push([set1, set2]);
                    this.removeOtherAffectedSetFromMaps(
                        intersectionMapSet,
                        otherAffectedIntersection,
                        set1, weightIntersectionMap,
                        setToIntersectionMap,
                    );
                    this.removeOtherAffectedSetFromMaps(
                        intersectionMapSet,
                        otherAffectedIntersection,
                        set2,
                        weightIntersectionMap,
                        setToIntersectionMap,
                    );
                    return false;
                }
                return true;
            });
            if (unaffectedIntersectingSets.length > 0) {
                intersectionMap.set(otherAffectedIntersection, unaffectedIntersectingSets);
            } else {
                intersectionMap.delete(otherAffectedIntersection);
            }
        });
        return intersectingPairs;
    }

    private removeOtherAffectedSetFromMaps<V>(
        map: Map<U, Map<Set<V>, number>>,
        key: U,
        set: Set<V>,
        weightMap: Map<number, Set<U>>,
        setToKeyMap: Map<Set<V>, Set<U>>,
    ): void {
        const setMap = <Map<Set<V>, number> >map.get(key);
        const setCount = <number>setMap.get(set);
        if (setCount > 1) {
            setMap.set(set, setCount - 1);
        } else {
            const intersectingElementsCount = this.split(key).length;
            const intersectingSetsCount = setMap.size;
            const weight = this.primaryWeight({intersectingElementsCount, intersectingSetsCount});
            this.removeFromSetOrDeleteFromMap(weightMap, weight, key);
            const updatedWeight = this.primaryWeight(
                {intersectingElementsCount, intersectingSetsCount: intersectingSetsCount - 1},
            );
            if (intersectingSetsCount > 1) {
                this.addToSetOrCreateKeyInMap(weightMap, updatedWeight, key);
            }
            this.removeFromSetOrDeleteFromMap(setToKeyMap, set, key);
            setMap.delete(set);
        }
        if (setMap.size === 0) {
            map.delete(key);
        }
    }

    private removeFromSetOrDeleteFromMap<V, W>(map: Map<V, Set<W>>, key: V, element: W): void {
        const elements = <Set<W>>map.get(key);
        if (elements.size > 1) {
            elements.delete(element);
        } else {
            map.delete(key);
        }
    }

    private addToSetOrCreateKeyInMap<V, W>(map: Map<V, Set<W>>, key: V, element: W): void {
        const elements = <Set<W>>map.get(key);
        if (elements) {
            elements.add(element);
        } else {
            map.set(key, new Set([element]));
        }
    }

    private filterFromSet<V>(set: Set<V>, callback: (element: V) => boolean): void {
        const iterator = set.keys();
        let nextElement = iterator.next();
        while (!nextElement.done) {
            if (!callback(nextElement.value)) {
                set.delete(nextElement.value);
            }
            nextElement = iterator.next();
        }
    }

    private addUpdatedToMaps(
        newSet: Set<T>,
        prevSets: Sets<T>,
        intersectingPairs: [Set<T>, Set<T>][],
        intersectionMap: IntersectionMap<T, U>,
        intersectionMapSet: IntersectionMapSet<T, U>,
        setToIntersectionMap: SetToIntersectionMap<T, U>,
        weightIntersectionMap: WeightIntersectionMap<U>,
    ) {
        prevSets.forEach((set) => {
            this.addUpdateToMaps(set, newSet, intersectionMap, intersectionMapSet, setToIntersectionMap, weightIntersectionMap);
        });
        intersectingPairs.forEach(([set1, set2]) => {
            this.addUpdateToMaps(set1, set2, intersectionMap, intersectionMapSet, setToIntersectionMap, weightIntersectionMap);
        });
    }

    private updateSetObj(set: Set<T>, setNodeMap: Map<Set<T>, SetNode<T>>, newIntersectingObj: SetNode<T>, depth: number) {
        const setNode = <SetNode<T>>setNodeMap.get(set);
        if (setNode.depth >= depth) {
            depth = setNode.depth + 1;
        }
        this.filterFromSet(setNode.rest, (element) => !newIntersectingObj.set.has(element));
        setNode.imports.push(newIntersectingObj);
        return depth;
    }

    private addUpdateToMaps(
        set1: Set<T>,
        set2: Set<T>,
        intersectionMap: IntersectionMap<T, U>,
        intersectionMapSet: IntersectionMapSet<T, U>,
        setToIntersectionMap: SetToIntersectionMap<T, U>,
        weightIntersectionMap: WeightIntersectionMap<U>,
    ): void {
        const intersection = intersectSets(set1, set2);
        if (intersection.size > 0) {
            const intersectionId = this.join([...intersection]);
            const intersectingSets = intersectionMap.get(intersectionId);
            if (intersectingSets) {
                intersectingSets.push([set1, set2]);
            } else {
                intersectionMap.set(intersectionId, [[set1, set2]]);
            }
            const intersectingMapSets = intersectionMapSet.get(intersectionId);
            let intersectingSetsCount: number;
            if (intersectingMapSets) {
                const prevWeight = this.primaryWeight(
                    {intersectingElementsCount: intersection.size, intersectingSetsCount: intersectingMapSets.size},
                );
                this.removeFromSetOrDeleteFromMap(weightIntersectionMap, prevWeight, intersectionId);
                this.addToIntersectingMapSets(intersectingMapSets, set1);
                this.addToIntersectingMapSets(intersectingMapSets, set2);
                intersectingSetsCount = intersectingMapSets.size;
            } else {
                intersectionMapSet.set(intersectionId, new Map([[set1, 1], [set2, 1]]));
                intersectingSetsCount = 2;
            }
            const weight = this.primaryWeight(
                {intersectingElementsCount: intersection.size, intersectingSetsCount},
            );
            this.addToSetOrCreateKeyInMap(weightIntersectionMap, weight, intersectionId);
            this.addToSetOrCreateKeyInMap(setToIntersectionMap, set1, intersectionId);
            this.addToSetOrCreateKeyInMap(setToIntersectionMap, set2, intersectionId);
        }
    }

    private addToIntersectingMapSets(
        intersectingMapSets: Map<Set<T>, number>,
        set: Set<T>,
    ): void {
        const intersectingSetCount = intersectingMapSets.get(set);
        if (intersectingSetCount) {
            intersectingMapSets.set(set, intersectingSetCount + 1);
        } else {
            intersectingMapSets.set(set, 1);
        }
    }
}
