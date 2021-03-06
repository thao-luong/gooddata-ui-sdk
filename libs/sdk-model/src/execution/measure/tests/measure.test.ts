// (C) 2019-2020 GoodData Corporation

import { Velocity, Won } from "../../../../__mocks__/model";
import {
    modifyMeasure,
    modifySimpleMeasure,
    newArithmeticMeasure,
    newPopMeasure,
    newPreviousPeriodMeasure,
} from "../factory";
import {
    IPreviousPeriodDateDataSet,
    measureAggregation,
    measureAlias,
    measureArithmeticOperands,
    measureArithmeticOperator,
    measureDoesComputeRatio,
    measureFilters,
    measureFormat,
    measureIdentifier,
    measureItem,
    measureLocalId,
    measureMasterIdentifier,
    measurePopAttribute,
    measurePreviousPeriodDateDataSets,
    measureTitle,
    measureUri,
} from "../index";
import { ObjRef } from "../../../objRef";
import { newPositiveAttributeFilter } from "../../filter/factory";
import { IFilter } from "../../filter";
import { idRef, uriRef } from "../../../objRef/factory";
import { applyRatioRule, ComputeRatioRule } from "../../buckets";

const SimpleMeasureWithIdentifier = Won;
const SimpleMeasureWithRatio = modifySimpleMeasure(Won, (m) => m.ratio());
const SimpleMeasureWithUri = modifySimpleMeasure(Won);
SimpleMeasureWithUri.measure.definition.measureDefinition.item = { uri: "/uri" };
const SimpleMeasureWithFilters = modifySimpleMeasure(Won, (m) =>
    m.filters(newPositiveAttributeFilter(idRef("myAttribute"), ["foo"])),
);

const ArithmeticMeasure = newArithmeticMeasure([Won, Velocity.Min], "sum");
const PopMeasure = newPopMeasure(measureLocalId(Won), "myPopAttribute");
const PreviousPeriodMeasure = newPreviousPeriodMeasure(Won, [{ dataSet: "dataSet", periodsAgo: 1 }]);

const InvalidScenarios: Array<[string, any]> = [
    ["measure is undefined", undefined],
    ["measure is null", null],
];

describe("measureItem", () => {
    const Scenarios: Array<[string, any, ObjRef | undefined]> = [
        ["undefined for arithmetic measure", ArithmeticMeasure, undefined],
        ["undefined for PoP measure", PopMeasure, undefined],
        ["undefined for Previous Period measure", PreviousPeriodMeasure, undefined],
        ["ref for simple measure", SimpleMeasureWithUri, uriRef("/uri")],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureItem(measureArg)).toEqual(expectedResult);
    });
});

describe("measureUri", () => {
    const Scenarios: Array<[string, any, string | undefined]> = [
        ["undefined if measure with identifier", SimpleMeasureWithIdentifier, undefined],
        ["undefined for arithmetic measure", ArithmeticMeasure, undefined],
        ["undefined for PoP measure", PopMeasure, undefined],
        ["undefined for Previous Period measure", PreviousPeriodMeasure, undefined],
        ["uri for simple measure using URI", SimpleMeasureWithUri, "/uri"],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureUri(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureUri(input)).toThrow();
    });
});

describe("measureIdentifier", () => {
    const Scenarios: Array<[string, any, string | undefined]> = [
        ["undefined if measure with uri", SimpleMeasureWithUri, undefined],
        ["undefined for arithmetic measure", ArithmeticMeasure, undefined],
        ["undefined for PoP measure", PopMeasure, undefined],
        ["undefined for Previous Period measure", PreviousPeriodMeasure, undefined],
        ["identifier for simple measure using URI", SimpleMeasureWithIdentifier, "afSEwRwdbMeQ"],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureIdentifier(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureIdentifier(input)).toThrow();
    });
});

describe("measureDoesComputeRatio", () => {
    const Scenarios: Array<[boolean, string, any]> = [
        [false, "arithmetic measure", ArithmeticMeasure],
        [false, "PoP measure", PopMeasure],
        [false, "Previous Period measure", PreviousPeriodMeasure],
        [false, "simple measure without ratio", SimpleMeasureWithIdentifier],
        [true, "simple measure with ratio", SimpleMeasureWithRatio],
    ];

    it.each(Scenarios)("should return %s for %s", (expectedResult, _desc, measureArg) => {
        expect(measureDoesComputeRatio(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureDoesComputeRatio(input)).toThrow();
    });
});

describe("measureMasterIdentifier", () => {
    const Scenarios: Array<[string, any, string | undefined]> = [
        ["undefined for arithmetic measure", ArithmeticMeasure, undefined],
        ["undefined for simple measure", SimpleMeasureWithIdentifier, undefined],
        ["simple measure local id for PoP measure", PopMeasure, "m_afSEwRwdbMeQ"],
        ["simple measure local id for PreviousPeriod measure", PreviousPeriodMeasure, "m_afSEwRwdbMeQ"],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureMasterIdentifier(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureMasterIdentifier(input)).toThrow();
    });
});

describe("measureArithmeticOperands", () => {
    const Scenarios: Array<[string, any, string[] | undefined]> = [
        ["undefined for simple measure", SimpleMeasureWithIdentifier, undefined],
        ["simple measure local id for PoP measure", PopMeasure, undefined],
        ["simple measure local id for PreviousPeriod measure", PreviousPeriodMeasure, undefined],
        [
            "undefined for arithmetic measure",
            ArithmeticMeasure,
            ["m_afSEwRwdbMeQ", "m_fact.stagehistory.velocity_min"],
        ],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureArithmeticOperands(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureArithmeticOperands(input)).toThrow();
    });
});

describe("measureArithmeticOperator", () => {
    const Scenarios: Array<[string, any, string | undefined]> = [
        ["undefined for simple measure", SimpleMeasureWithIdentifier, undefined],
        ["simple measure local id for PoP measure", PopMeasure, undefined],
        ["simple measure local id for PreviousPeriod measure", PreviousPeriodMeasure, undefined],
        ["undefined for arithmetic measure", ArithmeticMeasure, "sum"],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureArithmeticOperator(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureArithmeticOperator(input)).toThrow();
    });
});

describe("measureAlias", () => {
    const MeasureWithAlias = modifyMeasure(SimpleMeasureWithIdentifier, (m) => m.alias("customAlias"));
    const Scenarios: Array<[string, any, string | undefined]> = [
        ["undefined for measure without alias", SimpleMeasureWithIdentifier, undefined],
        ["alias value when defined", MeasureWithAlias, "customAlias"],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureAlias(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureAlias(input)).toThrow();
    });
});

describe("measureTitle", () => {
    const MeasureWithTitle = modifyMeasure(SimpleMeasureWithIdentifier, (m) => m.title("customTitle"));
    const Scenarios: Array<[string, any, string | undefined]> = [
        ["undefined for measure without title", SimpleMeasureWithIdentifier, undefined],
        ["title value when defined", MeasureWithTitle, "customTitle"],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureTitle(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureTitle(input)).toThrow();
    });
});

describe("measureFormat", () => {
    const MeasureWithFormat = modifyMeasure(SimpleMeasureWithIdentifier, (m) => m.format("customFormat"));
    const Scenarios: Array<[string, any, string | undefined]> = [
        ["undefined for measure without format", SimpleMeasureWithIdentifier, undefined],
        ["format value when defined", MeasureWithFormat, "customFormat"],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureFormat(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureFormat(input)).toThrow();
    });
});

describe("measureAggregation", () => {
    const MeasureWithAggregation = modifySimpleMeasure(SimpleMeasureWithIdentifier, (m) =>
        m.aggregation("median"),
    );
    const Scenarios: Array<[string, any, string | undefined]> = [
        ["undefined for measure without aggregation", SimpleMeasureWithIdentifier, undefined],
        ["aggregation value when defined", MeasureWithAggregation, "median"],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureAggregation(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureAggregation(input)).toThrow();
    });
});

describe("measureFilters", () => {
    const Scenarios: Array<[string, any, IFilter[] | undefined]> = [
        ["undefined for measure without filters", SimpleMeasureWithIdentifier, undefined],
        [
            "filter values when defined",
            SimpleMeasureWithFilters,
            [
                {
                    positiveAttributeFilter: {
                        displayForm: { identifier: "myAttribute" },
                        in: { values: ["foo"] },
                    },
                },
            ],
        ],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measureFilters(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measureFilters(input)).toThrow();
    });
});

describe("measurePopAttribute", () => {
    const Scenarios: Array<[string, any, ObjRef | undefined]> = [
        ["undefined for measure without PoP attribute", SimpleMeasureWithIdentifier, undefined],
        ["PoP attribute value when defined", PopMeasure, { identifier: "myPopAttribute", type: "attribute" }],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measurePopAttribute(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measurePopAttribute(input)).toThrow();
    });
});

describe("measurePreviousPeriodDateDataSets", () => {
    const Scenarios: Array<[string, any, IPreviousPeriodDateDataSet[] | undefined]> = [
        [
            "undefined for measure without previous period date data sets",
            SimpleMeasureWithIdentifier,
            undefined,
        ],
        [
            "previous period date data set values when defined",
            PreviousPeriodMeasure,
            [{ dataSet: { identifier: "dataSet" }, periodsAgo: 1 }],
        ],
    ];

    it.each(Scenarios)("should return %s", (_desc, measureArg, expectedResult) => {
        expect(measurePreviousPeriodDateDataSets(measureArg)).toEqual(expectedResult);
    });

    it.each(InvalidScenarios)("should thrown when %s", (_desc, input) => {
        expect(() => measurePreviousPeriodDateDataSets(input)).toThrow();
    });
});

describe("bugfixes", () => {
    it("should not cause RAIL-2352", () => {
        const measureWithCustomLocalId = modifySimpleMeasure(Won, (m) => m.localId("customLocalId"));
        const derivedMeasure = newPreviousPeriodMeasure(measureWithCustomLocalId, [
            { dataSet: "dataSet", periodsAgo: 1 },
        ]);

        const result = applyRatioRule([measureWithCustomLocalId, derivedMeasure], ComputeRatioRule.NEVER);
        expect(measureMasterIdentifier(result[1])).toEqual(measureLocalId(result[0]));
    });
});
