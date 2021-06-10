import {
    weightFunctions,
    WeightedIntersectionsSplitter,
    GetNodeMetrics,
    splitIntersectionsShallow,
    BiggestIntersectionsSplitter,
    SetNode,
    ArrayNode,
} from '../src';

describe('Test splitting of intersections from sets', () => {
    test('Splits sets shallow', () => {
        const sets = new Set([
            new Set([1, 2, 3]),
            new Set([2, 3, 4]),
            new Set([3, 4, 5]),
        ]);
        const setNodes: SetNode<number>[] = [
            {
                set: new Set([1, 2, 3]),
                rest: new Set([1]),
                depth: 0,
                imports: [],
            },
            {
                set: new Set([2, 3, 4]),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set([3, 4, 5]),
                rest: new Set([5]),
                depth: 0,
                imports: [],
            },
            {
                set: new Set([2]),
                rest: new Set([2]),
                depth: 1,
                imports: [],
            },
            {
                set: new Set([3]),
                rest: new Set([3]),
                depth: 1,
                imports: [],
            },
            {
                set: new Set([4]),
                rest: new Set([4]),
                depth: 1,
                imports: [],
            },
        ];
        setNodes[0].imports.push(setNodes[3], setNodes[4]);
        setNodes[1].imports.push(setNodes[3], setNodes[4], setNodes[5]);
        setNodes[2].imports.push(setNodes[4], setNodes[5]);

        const shallowSplitNodes = splitIntersectionsShallow(sets);
        expect(shallowSplitNodes).toEqual(setNodes);

        const metrics = {
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
        };
        expect(new GetNodeMetrics().getNodeMetrics(shallowSplitNodes)).toEqual(metrics);
    });
    test('Splits set of sets of strings', () => {
        const sets = new Set([
            new Set(['1', '2', '3']),
            new Set(['2', '3', '4']),
            new Set(['3', '4', '5']),
        ]);
        const setNodes: SetNode<string>[] = [
            {
                set: new Set(['1', '2', '3']),
                rest: new Set(['1']),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3', '4']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['3', '4', '5']),
                rest: new Set(['5']),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3']),
                rest: new Set(['2']),
                depth: 1,
                imports: [],
            },
            {
                set: new Set(['3']),
                rest: new Set(['3']),
                depth: 2,
                imports: [],
            },
            {
                set: new Set(['4']),
                rest: new Set(['4']),
                depth: 1,
                imports: [],
            },
        ];
        setNodes[0].imports.push(setNodes[3]);
        setNodes[1].imports.push(setNodes[3], setNodes[5]);
        setNodes[2].imports.push(setNodes[4], setNodes[5]);
        setNodes[3].imports.push(setNodes[4]);

        const weightedSplitSetNodes = new WeightedIntersectionsSplitter(
            (array) => array.sort().join('\x00'),
            (string) => string.split('\x00'),
        ).splitSets(sets);

        expect(weightedSplitSetNodes).toEqual(setNodes);

        const metric = {
            maxDepth: 2,
            avgMaxDepth: 1.6666666666666667,
            avgDepth: 1.5,
            avgLeaves: 1.6666666666666667,
            avgImports: 2.3333333333333335,
            avgNodes: 3.3333333333333335,
            generatedNodes: 3,
            rootNodes: 3,
            elementsCount: 9,
            uniqueElements: 5,
        };

        expect(new GetNodeMetrics().getNodeMetrics(weightedSplitSetNodes)).toEqual(metric);
    });
    test('Splits set of sets of strings depending on used weight functions', () => {
        const sets = new Set([
            new Set(['1', '2', '3']),
            new Set(['1', '2', '3']),
            new Set(['2', '3', '4']),
        ]);
        const setNodesElementsCount: SetNode<string>[] = [
            {
                set: new Set(['1', '2', '3']),
                rest: new Set([]),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['1', '2', '3']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3', '4']),
                rest: new Set(['4']),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['1', '2', '3']),
                rest: new Set(['1']),
                depth: 1,
                imports: [],
            },
            {
                set: new Set(['2', '3']),
                rest: new Set(['2', '3']),
                depth: 2,
                imports: [],
            },
        ];
        setNodesElementsCount[0].imports.push(setNodesElementsCount[3]);
        setNodesElementsCount[1].imports.push(setNodesElementsCount[3]);
        setNodesElementsCount[2].imports.push(setNodesElementsCount[4]);
        setNodesElementsCount[3].imports.push(setNodesElementsCount[4]);

        expect(new WeightedIntersectionsSplitter(
            (array) => array.sort().join('\x00'),
            (string) => string.split('\x00'),
            weightFunctions.elementsCount,
            weightFunctions.setsCount,
        ).splitSets(sets)).toEqual(setNodesElementsCount);

        const setNodesSetsCount: SetNode<string>[] = [
            {
                set: new Set(['1', '2', '3']),
                rest: new Set([]),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['1', '2', '3']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3', '4']),
                rest: new Set(['4']),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3']),
                rest: new Set(['2', '3']),
                depth: 1,
                imports: [],
            },
            {
                set: new Set(['1']),
                rest: new Set(['1']),
                depth: 1,
                imports: [],
            },
        ];
        setNodesSetsCount[0].imports.push(setNodesSetsCount[3], setNodesSetsCount[4]);
        setNodesSetsCount[1].imports.push(setNodesSetsCount[3], setNodesSetsCount[4]);
        setNodesSetsCount[2].imports.push(setNodesSetsCount[3]);

        expect(new WeightedIntersectionsSplitter(
            (array) => array.sort().join('\x00'),
            (string) => string.split('\x00'),
            weightFunctions.setsCount,
            weightFunctions.elementsCount,
        ).splitSets(sets)).toEqual(setNodesSetsCount);
    });
    test('Splits set of sets of strings by biggest intersection differently than by weight functions ', () => {
        const sets = new Set([
            new Set(['1', '2', '3', '4']),
            new Set(['1', '2', '3', '4']),
            new Set(['2', '3', '4']),
            new Set(['2', '3', '4']),
        ]);
        const setNodesBiggestIntersection: SetNode<string>[] = [
            {
                set: new Set(['1', '2', '3', '4']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['1', '2', '3', '4']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3', '4']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3', '4']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['1', '2', '3', '4']),
                rest: new Set(['1']),
                depth: 1,
                imports: [],
            },
            {
                set: new Set(['2', '3', '4']),
                rest: new Set(['2', '3', '4']),
                depth: 2,
                imports: [],
            },
        ];
        setNodesBiggestIntersection[0].imports.push(setNodesBiggestIntersection[4]);
        setNodesBiggestIntersection[1].imports.push(setNodesBiggestIntersection[4]);
        setNodesBiggestIntersection[2].imports.push(setNodesBiggestIntersection[5]);
        setNodesBiggestIntersection[3].imports.push(setNodesBiggestIntersection[5]);
        setNodesBiggestIntersection[4].imports.push(setNodesBiggestIntersection[5]);
        expect(new BiggestIntersectionsSplitter(true).splitSets(sets)).toEqual(setNodesBiggestIntersection);

        const setNodesWeightFunctionBiggestIntersection: SetNode<string>[] = [
            {
                set: new Set(['1', '2', '3', '4']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['1', '2', '3', '4']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3', '4']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3', '4']),
                rest: new Set(),
                depth: 0,
                imports: [],
            },
            {
                set: new Set(['2', '3', '4']),
                rest: new Set(['2', '3', '4']),
                depth: 1,
                imports: [],
            },
            {
                set: new Set(['1']),
                rest: new Set(['1']),
                depth: 1,
                imports: [],
            },
        ];
        setNodesWeightFunctionBiggestIntersection[0].imports.push(setNodesWeightFunctionBiggestIntersection[4], setNodesWeightFunctionBiggestIntersection[5]);
        setNodesWeightFunctionBiggestIntersection[1].imports.push(setNodesWeightFunctionBiggestIntersection[4], setNodesWeightFunctionBiggestIntersection[5]);
        setNodesWeightFunctionBiggestIntersection[2].imports.push(setNodesWeightFunctionBiggestIntersection[4]);
        setNodesWeightFunctionBiggestIntersection[3].imports.push(setNodesWeightFunctionBiggestIntersection[4]);

        expect(new WeightedIntersectionsSplitter(
            (array) => array.sort().join('\x00'),
            (string) => string.split('\x00'),
            weightFunctions.setsCount,
            weightFunctions.elementsCount,
        ).splitSets(sets)).toEqual(setNodesWeightFunctionBiggestIntersection);

        const metricBiggestIntersection = {
            maxDepth: 2,
            avgMaxDepth: 1.5,
            avgDepth: 1.5,
            avgLeaves: 1,
            avgImports: 1.5,
            avgNodes: 2.5,
            generatedNodes: 2,
            rootNodes: 4,
            elementsCount: 14,
            uniqueElements: 4,
        };

        const metricWeightFunctionBiggestIntersection = {
            maxDepth: 1,
            avgMaxDepth: 1,
            avgDepth: 1,
            avgLeaves: 1.5,
            avgImports: 1.5,
            avgNodes: 2.5,
            generatedNodes: 2,
            rootNodes: 4,
            elementsCount: 14,
            uniqueElements: 4,
        };

        expect(new GetNodeMetrics().getNodeMetrics(setNodesBiggestIntersection)).toEqual(metricBiggestIntersection);
        expect(new GetNodeMetrics().getNodeMetrics(setNodesWeightFunctionBiggestIntersection)).toEqual(metricWeightFunctionBiggestIntersection);
    });
});
describe('Test splitting of intersections from arrays', () => {
    test('Splits arrays shallow', () => {
        const arrays = [
            [1, 2, 3],
            [2, 3, 4],
            [3, 4, 5],
        ];
        const arrayNodes: ArrayNode<number>[] = [
            {
                array: [1, 2, 3],
                rest: [1],
                depth: 0,
                imports: [],
            },
            {
                array: [2, 3, 4],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: [3, 4, 5],
                rest: [5],
                depth: 0,
                imports: [],
            },
            {
                array: [2],
                rest: [2],
                depth: 1,
                imports: [],
            },
            {
                array: [3],
                rest: [3],
                depth: 1,
                imports: [],
            },
            {
                array: [4],
                rest: [4],
                depth: 1,
                imports: [],
            },
        ];
        arrayNodes[0].imports.push(arrayNodes[3], arrayNodes[4]);
        arrayNodes[1].imports.push(arrayNodes[3], arrayNodes[4], arrayNodes[5]);
        arrayNodes[2].imports.push(arrayNodes[4], arrayNodes[5]);

        const shallowSplitNodes = splitIntersectionsShallow(arrays);
        expect(shallowSplitNodes).toEqual(arrayNodes);

        const metrics = {
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
        };
        expect(new GetNodeMetrics().getNodeMetrics(shallowSplitNodes)).toEqual(metrics);
    });
    test('Splits array of arrays of strings', () => {
        const arrays = [
            ['1', '2', '3'],
            ['2', '3', '4'],
            ['3', '4', '5'],
        ];
        const arrayNodes: ArrayNode<string>[] = [
            {
                array: ['1', '2', '3'],
                rest: ['1'],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3', '4'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['3', '4', '5'],
                rest: ['5'],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3'],
                rest: ['2'],
                depth: 1,
                imports: [],
            },
            {
                array: ['3'],
                rest: ['3'],
                depth: 2,
                imports: [],
            },
            {
                array: ['4'],
                rest: ['4'],
                depth: 1,
                imports: [],
            },
        ];
        arrayNodes[0].imports.push(arrayNodes[3]);
        arrayNodes[1].imports.push(arrayNodes[3], arrayNodes[5]);
        arrayNodes[2].imports.push(arrayNodes[4], arrayNodes[5]);
        arrayNodes[3].imports.push(arrayNodes[4]);

        const weightedSplitSetNodes = new WeightedIntersectionsSplitter<string, string>(
            (array) => array.sort().join('\x00'),
            (string) => string.split('\x00'),
        ).splitArrays(arrays);

        expect(weightedSplitSetNodes).toEqual(arrayNodes);

        const metric = {
            maxDepth: 2,
            avgMaxDepth: 1.6666666666666667,
            avgDepth: 1.5,
            avgLeaves: 1.6666666666666667,
            avgImports: 2.3333333333333335,
            avgNodes: 3.3333333333333335,
            generatedNodes: 3,
            rootNodes: 3,
            elementsCount: 9,
            uniqueElements: 5,
        };

        expect(new GetNodeMetrics().getNodeMetrics(weightedSplitSetNodes)).toEqual(metric);
    });
    test('Splits array of arrays of strings depending on used weight functions', () => {
        const arrays = [
            ['1', '2', '3'],
            ['1', '2', '3'],
            ['2', '3', '4'],
        ];
        const arrayNodesElementsCount: ArrayNode<string>[] = [
            {
                array: ['1', '2', '3'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['1', '2', '3'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3', '4'],
                rest: ['4'],
                depth: 0,
                imports: [],
            },
            {
                array: ['1', '2', '3'],
                rest: ['1'],
                depth: 1,
                imports: [],
            },
            {
                array: ['2', '3'],
                rest: ['2', '3'],
                depth: 2,
                imports: [],
            },
        ];
        arrayNodesElementsCount[0].imports.push(arrayNodesElementsCount[3]);
        arrayNodesElementsCount[1].imports.push(arrayNodesElementsCount[3]);
        arrayNodesElementsCount[2].imports.push(arrayNodesElementsCount[4]);
        arrayNodesElementsCount[3].imports.push(arrayNodesElementsCount[4]);

        expect(new WeightedIntersectionsSplitter(
            (array) => array.sort().join('\x00'),
            (string) => string.split('\x00'),
            weightFunctions.elementsCount,
            weightFunctions.setsCount,
        ).splitArrays(arrays)).toEqual(arrayNodesElementsCount);

        const arrayNodesSetsCount: ArrayNode<string>[] = [
            {
                array: ['1', '2', '3'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['1', '2', '3'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3', '4'],
                rest: ['4'],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3'],
                rest: ['2', '3'],
                depth: 1,
                imports: [],
            },
            {
                array: ['1'],
                rest: ['1'],
                depth: 1,
                imports: [],
            },
        ];
        arrayNodesSetsCount[0].imports.push(arrayNodesSetsCount[3], arrayNodesSetsCount[4]);
        arrayNodesSetsCount[1].imports.push(arrayNodesSetsCount[3], arrayNodesSetsCount[4]);
        arrayNodesSetsCount[2].imports.push(arrayNodesSetsCount[3]);

        expect(new WeightedIntersectionsSplitter(
            (array) => array.sort().join('\x00'),
            (string) => string.split('\x00'),
            weightFunctions.setsCount,
            weightFunctions.elementsCount,
        ).splitArrays(arrays)).toEqual(arrayNodesSetsCount);
    });
    test('Splits array of arrays of strings by biggest intersection differently than by weight functions.', () => {
        const arrays = [
            ['1', '2', '3', '4'],
            ['1', '2', '3', '4'],
            ['2', '3', '4'],
            ['2', '3', '4'],
        ];
        const arrayNodesBiggestIntersection: ArrayNode<string>[] = [
            {
                array: ['1', '2', '3', '4'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['1', '2', '3', '4'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3', '4'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3', '4'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['1', '2', '3', '4'],
                rest: ['1'],
                depth: 1,
                imports: [],
            },
            {
                array: ['2', '3', '4'],
                rest: ['2', '3', '4'],
                depth: 2,
                imports: [],
            },
        ];
        arrayNodesBiggestIntersection[0].imports.push(arrayNodesBiggestIntersection[4]);
        arrayNodesBiggestIntersection[1].imports.push(arrayNodesBiggestIntersection[4]);
        arrayNodesBiggestIntersection[2].imports.push(arrayNodesBiggestIntersection[5]);
        arrayNodesBiggestIntersection[3].imports.push(arrayNodesBiggestIntersection[5]);
        arrayNodesBiggestIntersection[4].imports.push(arrayNodesBiggestIntersection[5]);
        expect(new BiggestIntersectionsSplitter(true).splitArrays(arrays)).toEqual(arrayNodesBiggestIntersection);

        const arrayNodesWeightFunctionBiggestIntersection: ArrayNode<string>[] = [
            {
                array: ['1', '2', '3', '4'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['1', '2', '3', '4'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3', '4'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3', '4'],
                rest: [],
                depth: 0,
                imports: [],
            },
            {
                array: ['2', '3', '4'],
                rest: ['2', '3', '4'],
                depth: 1,
                imports: [],
            },
            {
                array: ['1'],
                rest: ['1'],
                depth: 1,
                imports: [],
            },
        ];
        arrayNodesWeightFunctionBiggestIntersection[0].imports.push(arrayNodesWeightFunctionBiggestIntersection[4], arrayNodesWeightFunctionBiggestIntersection[5]);
        arrayNodesWeightFunctionBiggestIntersection[1].imports.push(arrayNodesWeightFunctionBiggestIntersection[4], arrayNodesWeightFunctionBiggestIntersection[5]);
        arrayNodesWeightFunctionBiggestIntersection[2].imports.push(arrayNodesWeightFunctionBiggestIntersection[4]);
        arrayNodesWeightFunctionBiggestIntersection[3].imports.push(arrayNodesWeightFunctionBiggestIntersection[4]);

        expect(new WeightedIntersectionsSplitter(
            (array) => array.sort().join('\x00'),
            (string) => string.split('\x00'),
            weightFunctions.setsCount,
            weightFunctions.elementsCount,
        ).splitArrays(arrays)).toEqual(arrayNodesWeightFunctionBiggestIntersection);

        const metricBiggestIntersection = {
            maxDepth: 2,
            avgMaxDepth: 1.5,
            avgDepth: 1.5,
            avgLeaves: 1,
            avgImports: 1.5,
            avgNodes: 2.5,
            generatedNodes: 2,
            rootNodes: 4,
            elementsCount: 14,
            uniqueElements: 4,
        };

        const metricWeightFunctionBiggestIntersection = {
            maxDepth: 1,
            avgMaxDepth: 1,
            avgDepth: 1,
            avgLeaves: 1.5,
            avgImports: 1.5,
            avgNodes: 2.5,
            generatedNodes: 2,
            rootNodes: 4,
            elementsCount: 14,
            uniqueElements: 4,
        };

        expect(new GetNodeMetrics().getNodeMetrics(arrayNodesBiggestIntersection)).toEqual(metricBiggestIntersection);
        expect(new GetNodeMetrics().getNodeMetrics(arrayNodesWeightFunctionBiggestIntersection)).toEqual(metricWeightFunctionBiggestIntersection);
    });
});
describe('Works with any type of objects', () => {
    test('Works without a sorting function', () => {
        const a1 = [1];
        const a2 = [1];
        const a3 = [3];

        const sets = new Set([
            new Set([a1, a2, a3]),
            new Set([a2, a3]),
            new Set([a3]),
        ]);

        const setNodesWithArrays = [
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
                            },
                        ],
                        depth: 1,
                    },
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
                            },
                        ],
                        depth: 1,
                    },
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
                    },
                ],
                depth: 0,
            },
            {
                set: new Set([[1], [3]]),
                rest: new Set([[1]]),
                imports: [
                    {
                        set: new Set([[3]]),
                        rest: new Set([[3]]),
                        imports: [],
                        depth: 2,
                    },
                ],
                depth: 1,
            },
            {
                set: new Set([[3]]),
                rest: new Set([[3]]),
                imports: [],
                depth: 2,
            },
        ];
        expect(new BiggestIntersectionsSplitter(
            false,
        ).splitSets(sets)).toEqual(setNodesWithArrays);
    });
});
