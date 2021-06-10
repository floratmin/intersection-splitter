import { ArrayNode, SetNode } from './helpers';

/**
 * @typedef NodeMetric
 * @property maxDepth - The maximum depth of imports from the root node
 * @property leaves - The number of leaves this root node has
 * @property imports - The number of imports all imported files have together
 * @property nodes - The number of nodes which are connected to the root node
 * @property allNodes - Array of all elements from `rest`, used for verification
 * @property avgDepth - The average depth of imports from the root node
 */
type NodeMetric<U> = {
    maxDepth: number;
    leaves: number;
    imports: number;
    nodes: number;
    allNodes?: U[];
    avgDepth?: number;
    avgDepthSum?: number;
    avgMaxDepth?: number;
};

/**
 * @typedef Metric
 * @property maxDepth - The maximum depth of imports from all root nodes
 * @property avgMaxDepth - The average maximum depth of imports from all root nodes
 * @property avgDepth - The average depth of imports from all root nodes
 * @property avgLeaves - The average number of leaves
 * @property avgNodes - The average number of nodes connected to a root node
 * @property generatedNodes - The number of nodes generated
 * @property rootNodes - The number of root nodes
 * @property elementsCount - The number of elements of all root nodes
 * @property uniqueElements - The number of unique elements of all root nodes
 */
type Metric = {
    maxDepth: number;
    avgMaxDepth: number;
    avgDepth: number;
    avgLeaves: number;
    avgImports: number;
    avgNodes: number;
    generatedNodes: number;
    rootNodes: number;
    elementsCount: number;
    uniqueElements: number;
};

/**
 * Class to get metrics to a single ArrayNode or SetNode or an array of these.
 */
export class GetNodeMetrics<T, U extends Pick<ArrayNode<T>, 'rest' | 'imports' | 'depth'> | Pick<SetNode<T>, 'rest' | 'imports' | 'depth'>> {
    /**
     * Method to get metrics to an array of ArrayNodes or SetNodes
     * @param nodeObjects - The set of ArrayNodes or SetNodes to get the metrics
     */
    public getNodeMetrics(nodeObjects: U[]): Metric {
        let generatedNodes = 0;
        let elementsCount = 0;
        const allElements: Set<T> = new Set();
        const allMetrics = nodeObjects.filter((nodeObject) => {
            if (nodeObject.depth === 0) {
                // @ts-ignore
                const elements: T[] = 'set' in nodeObject ? [...nodeObject.set] : nodeObject.array;
                elementsCount += elements.length;
                elements.forEach((element) => {
                    allElements.add(element);
                });
                return true;
            }
            generatedNodes += 1;
            return false;
        }).map((nodeObject) => this.getNodeMetric(nodeObject));
        const cumulativeMetrics = allMetrics.reduce((cumulative, metric) => ({
            maxDepth: Math.max(cumulative.maxDepth, metric.maxDepth),
            avgMaxDepth: <number>cumulative.avgMaxDepth + metric.maxDepth,
            avgDepth: <number>cumulative.avgDepth + <number>metric.avgDepth,
            leaves: cumulative.leaves + metric.leaves,
            imports: cumulative.imports + metric.imports,
            nodes: cumulative.nodes + metric.nodes,
        }), {
            maxDepth: 0,
            avgMaxDepth: 0,
            avgDepth: 0,
            leaves: 0,
            imports: 0,
            nodes: 0,
        });
        const rootNodeCount = allMetrics.length;
        return {
            maxDepth: cumulativeMetrics.maxDepth,
            avgMaxDepth: <number>cumulativeMetrics.avgMaxDepth / rootNodeCount,
            avgDepth: <number>cumulativeMetrics.avgDepth / rootNodeCount,
            avgLeaves: cumulativeMetrics.leaves / rootNodeCount,
            avgImports: cumulativeMetrics.imports / rootNodeCount,
            avgNodes: cumulativeMetrics.nodes / rootNodeCount,
            generatedNodes,
            rootNodes: rootNodeCount,
            elementsCount,
            uniqueElements: allElements.size,
        };
    }

    /**
     * Method to get metrics to an ArrayNode or a SetNode.
     * @param nodeObj - The ArrayNode or SetNode to get the metrics
     */
    public getNodeMetric(nodeObj: U): NodeMetric<U> {
        const metrics: Required<NodeMetric<U>> = {
            maxDepth: 0,
            leaves: 0,
            imports: 0,
            nodes: 0,
            allNodes: [],
            avgDepth: NaN,
            avgDepthSum: 0,
            avgMaxDepth: NaN,
        };
        const allElements = this.getNodeMetricRecursive(nodeObj, metrics, 0);
        // @ts-ignore
        const nodeElements: T[] = 'set' in nodeObj ? [...nodeObj.set] : nodeObj.array;
        if (nodeElements.some((element) => !allElements.includes(element))) {
            throw new Error('Node Object is not valid');
        }
        return {
            maxDepth: metrics.maxDepth,
            leaves: metrics.leaves,
            imports: metrics.imports,
            nodes: metrics.nodes,
            avgDepth: metrics.avgDepthSum / metrics.leaves,
        };
    }

    private getNodeMetricRecursive(nodeObj: U, metrics: Required<NodeMetric<U>>, depth: number): T[] {
        metrics.nodes += 1;
        if (metrics.maxDepth < depth) {
            metrics.maxDepth = depth;
        }
        if (depth > 0 && nodeObj.imports.length === 0) {
            metrics.leaves += 1;
            metrics.avgDepthSum += depth;
        }
        if (nodeObj.imports.length > 0) {
            metrics.imports += nodeObj.imports.length;
            return [
                ...nodeObj.rest,
                ...nodeObj.imports.flatMap((nObj: ArrayNode<T> | SetNode<T>) => this.getNodeMetricRecursive(<U><unknown>nObj, metrics, depth + 1)),
            ];
        }
        return [...nodeObj.rest];
    }
}
