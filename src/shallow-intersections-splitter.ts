import {
    ArrayNode, Arrays, SetNode, Sets,
} from './helpers';

export function splitIntersectionsShallow<T>(collections: Sets<T>): SetNode<T>[];
export function splitIntersectionsShallow<T>(collections: Arrays<T>): ArrayNode<T>[];
/**
 * `SplitFunction` to split all intersections between sets or arrays into `SetNodes` or `ArrayNodes`, each containing one element.
 * The execution of this function is extremely fast but can result in bigger overall files depending on the structure generated by the sets.
 * @param collections - The set of sets or array of arrays used to split.
 */
export function splitIntersectionsShallow<T>(collections: Sets<T> | Arrays<T>): (SetNode<T> | ArrayNode<T>)[] {
    if (Array.isArray(collections)) {
        return splitIntersectionsArrayShallow(collections);
    }
    return splitIntersectionsSetsShallow(collections);
}

export function splitIntersectionsSetsShallow<T>(sets: Sets<T>): SetNode<T>[] {
    const setElements: Set<T> = new Set();
    const multipleSetElements: Set<T> = new Set();
    sets.forEach((set) => {
        set.forEach((element) => {
            if (setElements.has(element)) {
                multipleSetElements.add(element);
            }
            setElements.add(element);
        });
    });
    const multipleSetElementsMap: Map<T, SetNode<T>> = new Map();
    multipleSetElements.forEach((element) => {
        multipleSetElementsMap.set(element, {
            set: new Set([element]), rest: new Set([element]), depth: 1, imports: [],
        });
    });
    const setNodeArray: SetNode<T>[] = [];
    sets.forEach((set) => {
        const rest: Set<T> = new Set();
        const imports: SetNode<T>[] = [];
        set.forEach((element) => {
            if (multipleSetElements.has(element)) {
                imports.push(<SetNode<T>>multipleSetElementsMap.get(element));
            } else {
                rest.add(element);
            }
        });
        setNodeArray.push({
            set,
            rest,
            depth: 0,
            imports,
        });
    });
    multipleSetElementsMap.forEach((setNode) => {
        setNodeArray.push(setNode);
    });
    return setNodeArray;
}

export function splitIntersectionsArrayShallow<T>(arrays: Arrays<T>): ArrayNode<T>[] {
    const arrElements: Array<T> = [];
    const multipleArrayElements: Array<T> = [];
    arrays.forEach((array) => {
        array.forEach((element) => {
            if (arrElements.includes(element)) {
                multipleArrayElements.push(element);
            } else {
                arrElements.push(element);
            }
        });
    });
    const multipleArrayElementsMap: Map<T, ArrayNode<T>> = new Map();
    multipleArrayElements.forEach((element) => {
        multipleArrayElementsMap.set(element, {
            array: [element], rest: [element], depth: 1, imports: [],
        });
    });
    const arrayNodesArray: ArrayNode<T>[] = [];
    arrays.forEach((array) => {
        const rest: Array<T> = [];
        const imports: ArrayNode<T>[] = [];
        array.forEach((element) => {
            if (multipleArrayElements.includes(element)) {
                imports.push(<ArrayNode<T>>multipleArrayElementsMap.get(element));
            } else {
                rest.push(element);
            }
        });
        arrayNodesArray.push({
            array,
            rest,
            depth: 0,
            imports,
        });
    });
    multipleArrayElementsMap.forEach((arrayNode) => {
        arrayNodesArray.push(arrayNode);
    });
    return arrayNodesArray;
}