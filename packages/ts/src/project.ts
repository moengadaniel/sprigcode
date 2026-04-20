import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { listWorkspaceSourceFiles } from "@sprigcode/core";

export type TsProject = {
  workspaceRoot: string;
  files: string[];
  program: ts.Program;
  languageService: ts.LanguageService;
  compilerOptions: ts.CompilerOptions;
};

function loadCompilerOptions(workspaceRoot: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(workspaceRoot, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    return {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      jsx: ts.JsxEmit.Preserve,
      allowJs: false,
      skipLibCheck: true,
      strict: true
    };
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, workspaceRoot);
  return parsed.options;
}

export async function loadProject(workspaceRoot: string): Promise<TsProject> {
  const files = await listWorkspaceSourceFiles(workspaceRoot);
  const absoluteFiles = files.map((file) => path.join(workspaceRoot, file));
  const compilerOptions = loadCompilerOptions(workspaceRoot);
  const versions = new Map<string, string>();

  for (const filePath of absoluteFiles) {
    versions.set(filePath, "0");
  }

  const host: ts.LanguageServiceHost = {
    getCompilationSettings: () => compilerOptions,
    getCurrentDirectory: () => workspaceRoot,
    getScriptFileNames: () => absoluteFiles,
    getScriptVersion: (fileName) => versions.get(fileName) ?? "0",
    getScriptSnapshot: (fileName) => {
      if (!existsSync(fileName)) {
        return undefined;
      }

      return ts.ScriptSnapshot.fromString(readFileSync(fileName, "utf8"));
    },
    getDefaultLibFileName: ts.getDefaultLibFilePath,
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories
  };

  const languageService = ts.createLanguageService(host, ts.createDocumentRegistry());
  const program = languageService.getProgram();
  if (!program) {
    throw new Error("Failed to create TypeScript program.");
  }

  return {
    workspaceRoot,
    files,
    languageService,
    program,
    compilerOptions
  };
}

export function relativeFromWorkspace(project: TsProject, absolutePath: string): string {
  return path.relative(project.workspaceRoot, absolutePath).replaceAll("\\", "/");
}

export function absoluteInWorkspace(project: TsProject, relativePath: string): string {
  return path.join(project.workspaceRoot, relativePath);
}
