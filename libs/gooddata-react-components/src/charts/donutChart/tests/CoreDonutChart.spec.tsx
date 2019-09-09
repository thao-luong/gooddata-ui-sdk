// (C) 2007-2018 GoodData Corporation
import * as React from "react";
import { shallow } from "enzyme";

import { CoreDonutChart } from "../CoreDonutChart";
import { BaseChart } from "../../../_defunct/to_delete/BaseChart";
import { emptyDataSource } from "../../tests/mocks";

describe("DonutChart", () => {
    it("should render BaseChart", () => {
        const wrapper = shallow(<CoreDonutChart dataSource={emptyDataSource} />);
        expect(wrapper.find(BaseChart).length).toBe(1);
    });
});
