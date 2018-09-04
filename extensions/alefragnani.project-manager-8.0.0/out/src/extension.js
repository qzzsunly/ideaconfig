"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const fs = require("fs");
const path = require("path");
const vscode = require("vscode");
const stack = require("./stack");
const abstractLocator_1 = require("./abstractLocator");
const gitLocator_1 = require("./gitLocator");
const PathUtils_1 = require("./PathUtils");
const ProjectProvider_1 = require("./ProjectProvider");
const sorter_1 = require("./sorter");
const storage_1 = require("./storage");
const PROJECTS_FILE = "projects.json";
const VSCODE_ICON = "$(file-code)";
const GIT_ICON = "$(git-branch)";
const MERCURIAL_ICON = "$(git-branch)";
const SVN_ICON = "$(zap)";
const vscLocator = new abstractLocator_1.CustomProjectLocator("vscode", "VSCode", VSCODE_ICON, new abstractLocator_1.CustomRepositoryDetector([".vscode"]));
const gitLocator = new abstractLocator_1.CustomProjectLocator("git", "Git", GIT_ICON, new gitLocator_1.GitRepositoryDetector([".git"]));
const mercurialLocator = new abstractLocator_1.CustomProjectLocator("hg", "Mercurial", MERCURIAL_ICON, new abstractLocator_1.CustomRepositoryDetector([".hg", "hgrc"]));
const svnLocator = new abstractLocator_1.CustomProjectLocator("svn", "SVN", SVN_ICON, new abstractLocator_1.CustomRepositoryDetector([".svn", "pristine"]));
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    const recentProjects = context.globalState.get("recent", "");
    const aStack = new stack.StringStack();
    aStack.fromString(recentProjects);
    // load the projects
    const projectStorage = new storage_1.ProjectStorage(getProjectFilePath());
    vscode.commands.registerCommand("projectManager.open", (node) => {
        let uri;
        if (typeof node === "string") {
            uri = vscode.Uri.file(node);
        }
        else {
            uri = vscode.Uri.file(node.command.arguments[0]);
        }
        vscode.commands.executeCommand("vscode.openFolder", uri, false)
            .then(value => ({}), // done
        value => vscode.window.showInformationMessage("Could not open the project!"));
    });
    vscode.commands.registerCommand("projectManager.openInNewWindow", node => {
        const uri = vscode.Uri.file(node.command.arguments[0]);
        vscode.commands.executeCommand("vscode.openFolder", uri, true)
            .then(value => ({}), // done
        value => vscode.window.showInformationMessage("Could not open the project!"));
    });
    // register commands (here, because it needs to be used right below if an invalid JSON is present)
    vscode.commands.registerCommand("projectManager.saveProject", () => saveProject());
    vscode.commands.registerCommand("projectManager.refreshProjects", () => refreshProjects(true, true));
    vscode.commands.registerCommand("projectManager.editProjects", () => editProjects());
    vscode.commands.registerCommand("projectManager.listProjects", () => listProjects(false));
    vscode.commands.registerCommand("projectManager.listProjectsNewWindow", () => listProjects(true));
    // new commands (ActivityBar)
    vscode.commands.registerCommand("projectManager.addToWorkspace", (node) => addProjectToWorkspace(node));
    vscode.commands.registerCommand("projectManager.deleteProject", (node) => deleteProject(node));
    vscode.commands.registerCommand("projectManager.renameProject", (node) => renameProject(node));
    loadProjectsFile();
    // new place to register TreeView
    const projectProviderStorage = new ProjectProvider_1.ProjectProvider(projectStorage, context);
    const projectProviderVSCode = new ProjectProvider_1.ProjectProvider(vscLocator, context);
    const projectProviderGit = new ProjectProvider_1.ProjectProvider(gitLocator, context);
    const projectProviderMercurial = new ProjectProvider_1.ProjectProvider(mercurialLocator, context);
    const projectProviderSVN = new ProjectProvider_1.ProjectProvider(svnLocator, context);
    vscode.window.registerTreeDataProvider("projectsExplorerFavorites", projectProviderStorage);
    vscode.window.registerTreeDataProvider("projectsExplorerVSCode", projectProviderVSCode);
    vscode.window.registerTreeDataProvider("projectsExplorerGit", projectProviderGit);
    vscode.window.registerTreeDataProvider("projectsExplorerMercurial", projectProviderMercurial);
    vscode.window.registerTreeDataProvider("projectsExplorerSVN", projectProviderSVN);
    showTreeViewFromAllProviders();
    fs.watchFile(getProjectFilePath(), { interval: 100 }, (prev, next) => {
        loadProjectsFile();
        projectProviderStorage.refresh();
    });
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(cfg => {
        if (cfg.affectsConfiguration("projectManager.git") || cfg.affectsConfiguration("projectManager.hg") ||
            cfg.affectsConfiguration("projectManager.vscode") || cfg.affectsConfiguration("projectManager.svn") ||
            cfg.affectsConfiguration("projectManager.cacheProjectsBetweenSessions")) {
            refreshProjects();
        }
    }));
    let statusItem;
    showStatusBar();
    // function commands
    function showStatusBar(projectName) {
        const showStatusConfig = vscode.workspace.getConfiguration("projectManager").get("showProjectNameInStatusBar");
        // multi-root - decide do use the "first folder" as the original "rootPath"
        // let currentProjectPath = vscode.workspace.rootPath;
        const workspace0 = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
        const currentProjectPath = workspace0 ? workspace0.uri.fsPath : undefined;
        if (!showStatusConfig || !currentProjectPath) {
            return;
        }
        if (!statusItem) {
            statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        }
        statusItem.text = "$(file-directory) ";
        statusItem.tooltip = currentProjectPath;
        const openInNewWindow = vscode.workspace.getConfiguration("projectManager").get("openInNewWindowWhenClickingInStatusBar", false);
        if (openInNewWindow) {
            statusItem.command = "projectManager.listProjectsNewWindow";
        }
        else {
            statusItem.command = "projectManager.listProjects";
        }
        // if we have a projectName, we don't need to search.
        if (projectName) {
            statusItem.text += projectName;
            statusItem.show();
            return;
        }
        if (projectStorage.length() === 0) {
            return;
        }
        let foundProject = projectStorage.existsWithRootPath(currentProjectPath);
        if (!foundProject) {
            foundProject = vscLocator.existsWithRootPath(currentProjectPath);
        }
        if (!foundProject) {
            foundProject = gitLocator.existsWithRootPath(currentProjectPath);
        }
        if (!foundProject) {
            foundProject = mercurialLocator.existsWithRootPath(currentProjectPath);
        }
        if (!foundProject) {
            foundProject = svnLocator.existsWithRootPath(currentProjectPath);
        }
        if (foundProject) {
            statusItem.text += foundProject.name;
            statusItem.show();
        }
    }
    function updateStatusBar(oldName, oldPath, newName) {
        if (statusItem.text === "$(file-directory) " + oldName && statusItem.tooltip === oldPath) {
            statusItem.text = "$(file-directory) " + newName;
        }
    }
    function showTreeViewFromAllProviders() {
        projectProviderStorage.showTreeView();
        projectProviderVSCode.showTreeView();
        projectProviderGit.showTreeView();
        projectProviderMercurial.showTreeView();
        projectProviderSVN.showTreeView();
    }
    function refreshProjects(showMessage, forceRefresh) {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Window,
            title: "Refresh Projects"
        }, (progress) => __awaiter(this, void 0, void 0, function* () {
            progress.report({ message: "Refreshing Projects (VSCode)" });
            const rvscode = yield vscLocator.refreshProjects(forceRefresh);
            progress.report({ message: "Refreshing Projects (Git)" });
            const rgit = yield gitLocator.refreshProjects(forceRefresh);
            progress.report({ message: "Refreshing Projects (Mercurial)" });
            const rmercurial = yield mercurialLocator.refreshProjects(forceRefresh);
            progress.report({ message: "Refreshing Projects (SVN)" });
            const rsvn = yield svnLocator.refreshProjects(forceRefresh);
            if (rvscode || rgit || rmercurial || rsvn || forceRefresh) {
                progress.report({ message: "Refreshing Projects (TreeView)" });
                if (rvscode || forceRefresh) {
                    projectProviderVSCode.refresh();
                }
                if (rgit || forceRefresh) {
                    projectProviderGit.refresh();
                }
                if (rmercurial || forceRefresh) {
                    projectProviderMercurial.refresh();
                }
                if (rsvn || forceRefresh) {
                    projectProviderSVN.refresh();
                }
                showTreeViewFromAllProviders();
            }
            if (showMessage) {
                vscode.window.showInformationMessage("The projects have been refreshed!");
            }
        }));
    }
    function editProjects() {
        if (fs.existsSync(getProjectFilePath())) {
            vscode.workspace.openTextDocument(getProjectFilePath()).then(doc => {
                vscode.window.showTextDocument(doc);
            });
        }
        else {
            const optionEditProject = {
                title: "Yes, edit manually"
            };
            vscode.window.showErrorMessage("No projects saved yet! You should open a folder and use Save Project instead. Do you really want to edit manually? ", optionEditProject).then(option => {
                // nothing selected
                if (typeof option === "undefined") {
                    return;
                }
                if (option.title === "Yes, edit manually") {
                    projectStorage.push("Project Name", "Root Path", "");
                    projectStorage.save();
                    vscode.commands.executeCommand("projectManager.editProjects");
                }
                else {
                    return;
                }
            });
        }
    }
    function saveProject() {
        // Display a message box to the user
        // let wpath = vscode.workspace.rootPath;
        const workspace0 = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
        let wpath = workspace0 ? workspace0.uri.fsPath : undefined;
        if (!wpath) {
            vscode.window.showInformationMessage("Open a folder first to save a project");
            return;
        }
        if (process.platform === "win32") {
            wpath = wpath.substr(wpath.lastIndexOf("\\") + 1);
        }
        else {
            wpath = wpath.substr(wpath.lastIndexOf("/") + 1);
        }
        // ask the PROJECT NAME (suggest the )
        const ibo = {
            prompt: "Project Name",
            placeHolder: "Type a name for your project",
            value: wpath
        };
        vscode.window.showInputBox(ibo).then(projectName => {
            if (typeof projectName === "undefined") {
                return;
            }
            // 'empty'
            if (projectName === "") {
                vscode.window.showWarningMessage("You must define a name for the project.");
                return;
            }
            // let rootPath = PathUtils.compactHomePath(vscode.workspace.rootPath);
            const workspace0 = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
            const rootPath = workspace0 ? PathUtils_1.PathUtils.compactHomePath(workspace0.uri.fsPath) : undefined;
            if (!projectStorage.exists(projectName)) {
                aStack.push(projectName);
                context.globalState.update("recent", aStack.toString());
                projectStorage.push(projectName, rootPath, "");
                projectStorage.save();
                vscode.window.showInformationMessage("Project saved!");
                showStatusBar(projectName);
            }
            else {
                const optionUpdate = {
                    title: "Update"
                };
                const optionCancel = {
                    title: "Cancel"
                };
                vscode.window.showInformationMessage("Project already exists!", optionUpdate, optionCancel).then(option => {
                    // nothing selected
                    if (typeof option === "undefined") {
                        return;
                    }
                    if (option.title === "Update") {
                        aStack.push(projectName);
                        context.globalState.update("recent", aStack.toString());
                        projectStorage.updateRootPath(projectName, rootPath);
                        projectStorage.save();
                        vscode.window.showInformationMessage("Project saved!");
                        showStatusBar(projectName);
                        return;
                    }
                    else {
                        return;
                    }
                });
            }
        });
    }
    function sortProjectList(items) {
        let itemsToShow = PathUtils_1.PathUtils.expandHomePaths(items);
        itemsToShow = removeRootPath(itemsToShow);
        const checkInvalidPath = vscode.workspace.getConfiguration("projectManager").get("checkInvalidPathsBeforeListing", true);
        if (checkInvalidPath) {
            itemsToShow = PathUtils_1.PathUtils.indicateInvalidPaths(itemsToShow);
        }
        const sortList = vscode.workspace.getConfiguration("projectManager").get("sortList", "Name");
        const newItemsSorted = sorter_1.ProjectsSorter.SortItemsByCriteria(itemsToShow, sortList, aStack);
        return newItemsSorted;
    }
    function sortGroupedList(items) {
        if (vscode.workspace.getConfiguration("projectManager").get("groupList", false)) {
            return sortProjectList(items);
        }
        else {
            return items;
        }
    }
    function getProjects(itemsSorted) {
        return new Promise((resolve, reject) => {
            resolve(itemsSorted);
        });
    }
    // Filters out any newDirectories entries that are present in knownDirectories.
    function filterKnownDirectories(knownDirectories, newDirectories) {
        if (knownDirectories) {
            newDirectories = newDirectories.filter(item => !knownDirectories.some(sortedItem => PathUtils_1.PathUtils.expandHomePath(sortedItem.description).toLowerCase() === PathUtils_1.PathUtils.expandHomePath(item.fullPath).toLowerCase()));
        }
        return Promise.resolve(newDirectories);
    }
    function getLocatorProjects(itemsSorted, locator) {
        return new Promise((resolve, reject) => {
            locator.locateProjects()
                .then(filterKnownDirectories.bind(this, itemsSorted))
                .then((dirList) => {
                let newItems = [];
                newItems = dirList.map(item => {
                    return {
                        label: locator.icon + " " + item.name,
                        description: item.fullPath
                    };
                });
                newItems = sortGroupedList(newItems);
                resolve(itemsSorted.concat(newItems));
            });
        });
    }
    function listProjects(forceNewWindow) {
        let items = [];
        items = projectStorage.map();
        items = sortGroupedList(items);
        function onRejectListProjects(reason) {
            vscode.commands.executeCommand("setContext", "inProjectManagerList", false);
            vscode.window.showInformationMessage("Error loading projects: ${reason}");
        }
        // promisses
        function onResolve(selected) {
            vscode.commands.executeCommand("setContext", "inProjectManagerList", false);
            if (!selected) {
                return;
            }
            if (!fs.existsSync(selected.description.toString())) {
                if (selected.label.substr(0, 2) === "$(") {
                    vscode.window.showErrorMessage("Path does not exist or is unavailable.");
                    return;
                }
                const optionUpdateProject = {
                    title: "Update Project"
                };
                const optionDeleteProject = {
                    title: "Delete Project"
                };
                vscode.window.showErrorMessage("The project has an invalid path. What would you like to do?", optionUpdateProject, optionDeleteProject).then(option => {
                    // nothing selected
                    if (typeof option === "undefined") {
                        return;
                    }
                    if (option.title === "Update Project") {
                        vscode.commands.executeCommand("projectManager.editProjects");
                    }
                    else {
                        projectStorage.pop(selected.label);
                        projectStorage.save();
                        return;
                    }
                });
            }
            else {
                // project path
                let projectPath = selected.description;
                projectPath = PathUtils_1.PathUtils.normalizePath(projectPath);
                // update MRU
                aStack.push(selected.label);
                context.globalState.update("recent", aStack.toString());
                const uri = vscode.Uri.file(projectPath);
                vscode.commands.executeCommand("vscode.openFolder", uri, forceNewWindow)
                    .then(value => ({}), // done
                value => vscode.window.showInformationMessage("Could not open the project!"));
            }
        }
        const options = {
            matchOnDescription: vscode.workspace.getConfiguration("projectManager").get("filterOnFullPath", false),
            matchOnDetail: false,
            placeHolder: "Loading Projects (pick one to open)"
        };
        getProjects(items)
            .then((folders) => {
            return getLocatorProjects(folders, vscLocator);
        })
            .then((folders) => {
            return getLocatorProjects(folders, gitLocator);
        })
            .then((folders) => {
            return getLocatorProjects(folders, mercurialLocator);
        })
            .then((folders) => {
            return getLocatorProjects(folders, svnLocator);
        })
            .then((folders) => {
            if (folders.length === 0) {
                vscode.window.showInformationMessage("No projects saved yet!");
                return;
            }
            else {
                if (!vscode.workspace.getConfiguration("projectManager").get("groupList", false)) {
                    folders = sortProjectList(folders);
                }
                vscode.commands.executeCommand("setContext", "inProjectManagerList", true);
                vscode.window.showQuickPick(folders, options)
                    .then(onResolve, onRejectListProjects);
            }
        });
    }
    function removeRootPath(items) {
        // if (!vscode.workspace.rootPath) {
        const workspace0 = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0] : undefined;
        if (!workspace0 || !vscode.workspace.getConfiguration("projectManager").get("removeCurrentProjectFromList")) {
            return items;
        }
        else {
            return items.filter(value => value.description.toString().toLowerCase() !== vscode.workspace.rootPath.toLowerCase());
        }
    }
    function getChannelPath() {
        return vscode.env.appName.replace("Visual Studio ", "");
    }
    function loadProjectsFile() {
        const errorLoading = projectStorage.load();
        // how to handle now, since the extension starts 'at load'?
        if (errorLoading !== "") {
            const optionOpenFile = {
                title: "Open File"
            };
            vscode.window.showErrorMessage("Error loading projects.json file. Message: " + errorLoading, optionOpenFile).then(option => {
                // nothing selected
                if (typeof option === "undefined") {
                    return;
                }
                if (option.title === "Open File") {
                    vscode.commands.executeCommand("projectManager.editProjects");
                }
                else {
                    return;
                }
            });
            return null;
        }
    }
    function getProjectFilePath() {
        let projectFile;
        const projectsLocation = vscode.workspace.getConfiguration("projectManager").get("projectsLocation");
        if (projectsLocation !== "") {
            projectFile = path.join(projectsLocation, PROJECTS_FILE);
        }
        else {
            const appdata = process.env.APPDATA || (process.platform === "darwin" ? process.env.HOME + "/Library/Application Support" : "/var/local");
            const channelPath = getChannelPath();
            projectFile = path.join(appdata, channelPath, "User", PROJECTS_FILE);
            // in linux, it may not work with /var/local, then try to use /home/myuser/.config
            if ((process.platform === "linux") && (!fs.existsSync(projectFile))) {
                projectFile = path.join(PathUtils_1.homeDir, ".config/", channelPath, "User", PROJECTS_FILE);
            }
        }
        return projectFile;
    }
    function addProjectToWorkspace(node) {
        vscode.workspace.updateWorkspaceFolders(vscode.workspace.workspaceFolders ?
            vscode.workspace.workspaceFolders.length : 0, null, { uri: vscode.Uri.file(node.command.arguments[0]) });
    }
    function deleteProject(node) {
        aStack.pop(node.command.arguments[1]);
        projectStorage.pop(node.command.arguments[1]);
        projectStorage.save();
        vscode.window.showInformationMessage("Project successfully deleted!");
    }
    ;
    function renameProject(node) {
        const oldName = node.command.arguments[1];
        // Display a message box to the user
        // ask the NEW PROJECT NAME ()
        const ibo = {
            prompt: "New Project Name",
            placeHolder: "Type a new name for the project",
            value: oldName
        };
        vscode.window.showInputBox(ibo).then(newName => {
            if (typeof newName === "undefined") {
                return;
            }
            // 'empty'
            if (newName === "") {
                vscode.window.showWarningMessage("You must define a new name for the project.");
                return;
            }
            if (!projectStorage.exists(newName)) {
                aStack.rename(oldName, newName);
                projectStorage.rename(oldName, newName);
                projectStorage.save();
                vscode.window.showInformationMessage("Project renamed!");
                updateStatusBar(oldName, node.command.arguments[0], newName);
            }
            else {
                vscode.window.showErrorMessage("Project already exists!");
            }
        });
    }
    ;
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map