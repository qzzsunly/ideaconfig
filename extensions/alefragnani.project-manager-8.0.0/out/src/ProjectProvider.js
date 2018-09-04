"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const abstractLocator_1 = require("./abstractLocator");
const PathUtils_1 = require("./PathUtils");
const storage_1 = require("./storage");
exports.NODE_KIND = 0;
exports.NODE_PROJECT = 1;
var ProjectNodeKind;
(function (ProjectNodeKind) {
    ProjectNodeKind[ProjectNodeKind["NODE_KIND"] = 0] = "NODE_KIND";
    ProjectNodeKind[ProjectNodeKind["NODE_PROJECT"] = 1] = "NODE_PROJECT";
})(ProjectNodeKind = exports.ProjectNodeKind || (exports.ProjectNodeKind = {}));
;
;
;
let context;
class ProjectProvider {
    constructor(projectSource, ctx) {
        this.internalOnDidChangeTreeData = new vscode.EventEmitter();
        this.projectSource = projectSource;
        this.onDidChangeTreeData = this.internalOnDidChangeTreeData.event;
        context = ctx;
    }
    refresh() {
        this.internalOnDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        // loop !!!
        return new Promise(resolve => {
            if (element) {
                const ll = [];
                ll.push(new ProjectNode(element.label, vscode.TreeItemCollapsibleState.None, "git", element.preview, {
                    command: "projectManager.open",
                    title: "",
                    arguments: [element.preview.path],
                }));
                resolve(ll);
            }
            else {
                // ROOT
                // raw list
                const lll = [];
                // favorites
                if (this.projectSource instanceof storage_1.ProjectStorage) {
                    const projectsMapped = this.projectSource.map();
                    const projects = [];
                    projectsMapped.sort((n1, n2) => {
                        if (n1.label > n2.label) {
                            return 1;
                        }
                        if (n1.label < n2.label) {
                            return -1;
                        }
                        return 0;
                    });
                    // tslint:disable-next-line:prefer-for-of
                    for (let index = 0; index < projectsMapped.length; index++) {
                        const prj = projectsMapped[index];
                        // projects.push({
                        //   name: prj.label,
                        //   path: PathUtils.expandHomePath(prj.description)
                        // });
                        // lll.push(new ProjectNode("Favorites", vscode.TreeItemCollapsibleState.Collapsed, ProjectNodeKind.NODE_KIND, projects));
                        lll.push(new ProjectNode(prj.label, vscode.TreeItemCollapsibleState.None, "favorites", {
                            name: prj.label,
                            path: PathUtils_1.PathUtils.expandHomePath(prj.description)
                        }, {
                            command: "projectManager.open",
                            title: "",
                            arguments: [PathUtils_1.PathUtils.expandHomePath(prj.description), prj.label],
                        }));
                    }
                }
                // Locators (VSCode/Git/Mercurial/SVN)
                if (this.projectSource instanceof abstractLocator_1.CustomProjectLocator) {
                    const projects = [];
                    this.projectSource.initializeCfg(this.projectSource.kind);
                    if (this.projectSource.dirList.length > 0) {
                        this.projectSource.dirList.sort((n1, n2) => {
                            if (n1.name > n2.name) {
                                return 1;
                            }
                            if (n1.name < n2.name) {
                                return -1;
                            }
                            return 0;
                        });
                        // tslint:disable-next-line:prefer-for-of
                        for (let index = 0; index < this.projectSource.dirList.length; index++) {
                            const dirinfo = this.projectSource.dirList[index];
                            // projects.push({
                            //   name: dirinfo.name,
                            //   path: dirinfo.fullPath
                            // });
                            // lll.push(new ProjectNode(this.projectSource.displayName, 
                            //     vscode.TreeItemCollapsibleState.Collapsed, 
                            //     ProjectNodeKind.NODE_KIND, projects));
                            lll.push(new ProjectNode(dirinfo.name, vscode.TreeItemCollapsibleState.None, this.projectSource.displayName, {
                                name: dirinfo.name,
                                path: dirinfo.fullPath
                            }, {
                                command: "projectManager.open",
                                title: "",
                                arguments: [dirinfo.fullPath, this.projectSource.icon + " " + dirinfo.name],
                            }));
                        }
                    }
                }
                resolve(lll);
            }
        });
    }
    showTreeView() {
        const canShowTreeView = vscode.workspace.getConfiguration("projectManager").get("treeview.visible", true);
        if (this.projectSource instanceof storage_1.ProjectStorage) {
            vscode.commands.executeCommand("setContext", "projectManager.canShowTreeView" + "Favorites", canShowTreeView && this.projectSource.length() > 0);
            return;
        }
        if (this.projectSource instanceof abstractLocator_1.CustomProjectLocator) {
            if (canShowTreeView) {
                this.projectSource.initializeCfg(this.projectSource.kind);
                vscode.commands.executeCommand("setContext", "projectManager.canShowTreeView" + this.projectSource.displayName, this.projectSource.dirList.length > 0);
            }
            else {
                vscode.commands.executeCommand("setContext", "projectManager.canShowTreeView" + this.projectSource.displayName, false);
            }
            return;
        }
    }
}
exports.ProjectProvider = ProjectProvider;
class ProjectNode extends vscode.TreeItem {
    constructor(label, collapsibleState, icon, preview, command) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.icon = icon;
        this.preview = preview;
        this.command = command;
        this.iconPath = {
            light: context.asAbsolutePath(this.getProjectIcon(icon, "light")),
            dark: context.asAbsolutePath(this.getProjectIcon(icon, "dark"))
        };
        this.contextValue = "ProjectNodeKind";
        this.tooltip = preview.path;
    }
    getProjectIcon(project, lightDark) {
        return "images/ico-" + project.toLowerCase() + "-" + lightDark + ".svg";
    }
}
//# sourceMappingURL=ProjectProvider.js.map