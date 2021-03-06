// (C) 2019-2020 GoodData Corporation
import {
    IInsightsQueryOptions,
    IInsightsQueryResult,
    IInsightReferences,
    IInsightReferencing,
    IWorkspaceInsightsService,
    SupportedInsightReferenceTypes,
    UnexpectedError,
} from "@gooddata/sdk-backend-spi";
import {
    IInsight,
    IInsightDefinition,
    IVisualizationClass,
    ObjRef,
    objRefToString,
    insightTitle,
    insightId,
    IFilter,
    mergeFilters,
    insightFilters,
    insightSetFilters,
    idRef,
} from "@gooddata/sdk-model";
import {
    VisualizationObject,
    VisualizationObjects,
    VisualizationObjectSchema,
} from "@gooddata/api-client-tiger";
import uuid4 from "uuid/v4";

import { TigerAuthenticatedCallGuard } from "../../../types";
import { objRefToUri, objRefToIdentifier } from "../../../utils/api";
import { convertVisualizationObject } from "../../../convertors/fromBackend/VisualizationObjectConverter";
import { convertInsight } from "../../../convertors/toBackend/InsightConverter";

import { visualizationClasses as visualizationClassesMocks } from "./mocks/visualizationClasses";

const insightFromInsightDefinition = (insight: IInsightDefinition, id: string, uri: string): IInsight => {
    return {
        insight: {
            ...insight.insight,
            identifier: id,
            uri,
            ref: idRef(id),
        },
    };
};

export class TigerWorkspaceInsights implements IWorkspaceInsightsService {
    constructor(private readonly authCall: TigerAuthenticatedCallGuard, public readonly workspace: string) {}

    public getVisualizationClass = async (ref: ObjRef): Promise<IVisualizationClass> => {
        const uri = await objRefToUri(ref, this.workspace, this.authCall);
        const visualizationClasses = await this.getVisualizationClasses();

        const visualizationClass = visualizationClasses.find((v) => v.visualizationClass.uri === uri);
        if (!visualizationClass) {
            throw new UnexpectedError(`Visualization class for ${objRefToString(ref)} not found!`);
        }
        return visualizationClass;
    };

    public getVisualizationClasses = async (): Promise<IVisualizationClass[]> => {
        return this.authCall(async () => visualizationClassesMocks);
    };

    public getInsights = async (options?: IInsightsQueryOptions): Promise<IInsightsQueryResult> => {
        const insightsResponse = await this.authCall((sdk) => {
            const orderBy = options?.orderBy;
            if (orderBy === "updated") {
                // eslint-disable-next-line no-console
                console.warn('Tiger does not support sorting by "updated" in getInsights');
            }

            const sanitizedOrderBy = orderBy !== "updated" ? orderBy : undefined;

            const filter = options?.title
                ? {
                      filter: {
                          // the % sign means 0..many characters so %foo% means infix match of foo (case insensitive)
                          title: { LIKE: `%${options.title}%` },
                      },
                  }
                : undefined;

            return sdk.workspaceModel.getEntities(
                {
                    entity: "visualizationObjects",
                    workspaceId: this.workspace,
                },
                {
                    headers: { Accept: "application/vnd.gooddata.api+json" },
                    ...(options?.limit ? { pageLimit: options?.limit } : {}),
                    pageOffset: options?.offset ?? 0,
                    ...((filter ? { filter } : {}) as any),
                    ...(sanitizedOrderBy ? { sort: sanitizedOrderBy } : {}),
                },
            );
        });
        const { data: visualizationObjects } = insightsResponse.data as VisualizationObjects;
        const insights = visualizationObjects.map((visualizationObject) => {
            return insightFromInsightDefinition(
                convertVisualizationObject(
                    visualizationObject!.attributes!.content! as VisualizationObject.IVisualizationObject,
                ),
                visualizationObject.id,
                visualizationObject.links!.self,
            );
        });

        // TODO - where to get this "meta" information in new MD?
        // Count the objects from API vs get it from backend?
        const totalCount = insights.length;
        //const totalCount = (meta?.totalResourceCount as unknown) as number;
        // TODO - how to deal with pagination?
        //const hasNextPage = !!links?.next;
        const hasNextPage = false;

        const emptyResult: IInsightsQueryResult = {
            items: [],
            // TODO default to some backend limit here
            // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
            limit: options?.limit!,
            offset: options?.offset ?? 0,
            totalCount,
            next: () => Promise.resolve(emptyResult),
        };

        const result: IInsightsQueryResult = {
            items: insights,
            // TODO default to some backend limit here
            // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
            limit: options?.limit!,
            offset: options?.offset ?? 0,
            totalCount,
            next: hasNextPage
                ? () => this.getInsights({ ...options, offset: (options?.offset ?? 0) + insights.length })
                : () => Promise.resolve(emptyResult),
        };

        return result;
    };

    public getInsight = async (ref: ObjRef): Promise<IInsight> => {
        const id = await objRefToIdentifier(ref, this.authCall);
        const response = await this.authCall((sdk) =>
            sdk.workspaceModel.getEntity(
                {
                    entity: "visualizationObjects",
                    id: id,
                    workspaceId: this.workspace,
                },
                {
                    headers: { Accept: "application/vnd.gooddata.api+json" },
                },
            ),
        );
        const { data: visualizationObject, links } = response.data as VisualizationObjectSchema;
        const insight = insightFromInsightDefinition(
            convertVisualizationObject(
                visualizationObject.attributes!.content! as VisualizationObject.IVisualizationObject,
            ),
            visualizationObject.id,
            links!.self,
        );

        if (!insight) {
            throw new UnexpectedError(`Insight for ${objRefToString(ref)} not found!`);
        }

        return insight;
    };

    public createInsight = async (insight: IInsightDefinition): Promise<IInsight> => {
        const createResponse = await this.authCall((sdk) => {
            return sdk.workspaceModel.createEntity(
                {
                    entity: "visualizationObjects",
                    workspaceId: this.workspace,
                    analyticsObject: {
                        data: {
                            id: uuid4(),
                            type: "visualizationObject",
                            attributes: {
                                description: insightTitle(insight),
                                content: convertInsight(insight),
                                title: insightTitle(insight),
                            },
                        },
                    },
                },
                {
                    headers: {
                        Accept: "application/vnd.gooddata.api+json",
                        "Content-Type": "application/vnd.gooddata.api+json",
                    },
                },
            );
        });
        const insightData = createResponse.data as VisualizationObjectSchema;
        return insightFromInsightDefinition(insight, insightData.data.id, insightData.links!.self);
    };

    public updateInsight = async (insight: IInsight): Promise<IInsight> => {
        await this.authCall((sdk) => {
            return sdk.workspaceModel.updateEntity(
                {
                    entity: "visualizationObjects",
                    id: insightId(insight),
                    workspaceId: this.workspace,
                    analyticsObject: {
                        data: {
                            id: insightId(insight),
                            type: "visualizationObject",
                            attributes: {
                                description: insightTitle(insight),
                                content: convertInsight(insight),
                                title: insightTitle(insight),
                            },
                        },
                    },
                },
                {
                    headers: {
                        Accept: "application/vnd.gooddata.api+json",
                        "Content-Type": "application/vnd.gooddata.api+json",
                    },
                },
            );
        });
        return insight;
    };

    public deleteInsight = async (ref: ObjRef): Promise<void> => {
        const id = await objRefToIdentifier(ref, this.authCall);

        await this.authCall((sdk) =>
            sdk.workspaceModel.deleteEntity({
                entity: "visualizationObjects",
                id: id,
                workspaceId: this.workspace,
            }),
        );
    };

    public getInsightReferencedObjects = async (
        _insight: IInsight,
        _types?: SupportedInsightReferenceTypes[],
    ): Promise<IInsightReferences> => {
        return Promise.resolve({});
    };

    public getInsightReferencingObjects = async (_ref: ObjRef): Promise<IInsightReferencing> => {
        return Promise.resolve({});
    };

    public getInsightWithAddedFilters = async <T extends IInsightDefinition>(
        insight: T,
        filters: IFilter[],
    ): Promise<T> => {
        if (!filters.length) {
            return insight;
        }

        // we assume that all the filters in tiger already use idRefs exclusively
        const mergedFilters = mergeFilters(insightFilters(insight), filters);

        return insightSetFilters(insight, mergedFilters);
    };
}
