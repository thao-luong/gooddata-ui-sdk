// (C) 2019-2020 GoodData Corporation
import { GdcProject, GdcUser } from "@gooddata/api-model-bear";
import { IWorkspaceDescriptor, IWorkspacePermissions } from "@gooddata/sdk-backend-spi";

export const convertUserProject = ({ userProject }: GdcProject.IUserProject): IWorkspaceDescriptor => {
    const workspace: IWorkspaceDescriptor = {
        description: userProject.projectDescription,
        title: userProject.projectTitle,
        id: userProject.links.self.match(/\/gdc\/projects\/(.+)/i)![1],
    };

    if (userProject.demoProject) {
        workspace.isDemo = true;
    }

    return workspace;
};

export const convertPermissions = ({ permissions }: GdcUser.IProjectPermissions): IWorkspacePermissions => {
    const workspacePermissions = Object.keys(permissions).reduce(
        (acc: Partial<IWorkspacePermissions>, permission) => {
            const hasPermission = permissions[permission as GdcUser.ProjectPermission];
            return {
                ...acc,
                [permission]: hasPermission === "1",
            };
        },
        {},
    );

    return workspacePermissions as IWorkspacePermissions;
};
