export interface LanguageRegistryEntry {
  id: string;
  displayName: string;
  version: string;
  sourceExtension: string;
  compilerCommandTemplate?: string;
  runCommandTemplate: string;
  imageIdentifier: string;
  defaultTimeLimitMs: number;
  defaultMemoryLimitMb: number;
  defaultProcessLimit: number;
  defaultOutputLimitBytes: number;
  enabled: boolean;
  compileRequired: boolean;
  starterCode: string;
  forbiddenConfigurationPatterns: string[];
}

export const defaultLanguages: LanguageRegistryEntry[] = [
  { id: "c", displayName: "C", version: "C17", sourceExtension: "c", compilerCommandTemplate: "gcc main.c -O2 -std=c17 -o main", runCommandTemplate: "./main", imageIdentifier: "ghcr.io/campustest/runner-c:1.0.0", defaultTimeLimitMs: 2000, defaultMemoryLimitMb: 128, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: true, starterCode: "int main(void) { return 0; }\n", forbiddenConfigurationPatterns: ["system(", "popen("] },
  { id: "cpp", displayName: "C++", version: "C++20", sourceExtension: "cpp", compilerCommandTemplate: "g++ main.cpp -O2 -std=c++20 -o main", runCommandTemplate: "./main", imageIdentifier: "ghcr.io/campustest/runner-cpp:1.0.0", defaultTimeLimitMs: 2000, defaultMemoryLimitMb: 256, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: true, starterCode: "#include <bits/stdc++.h>\nint main(){return 0;}\n", forbiddenConfigurationPatterns: ["std::system", "popen("] },
  { id: "java", displayName: "Java", version: "21", sourceExtension: "java", compilerCommandTemplate: "javac Main.java", runCommandTemplate: "java Main", imageIdentifier: "ghcr.io/campustest/runner-java:21.0.0", defaultTimeLimitMs: 3000, defaultMemoryLimitMb: 512, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: true, starterCode: "class Main { public static void main(String[] args) {} }\n", forbiddenConfigurationPatterns: ["Runtime.getRuntime", "ProcessBuilder"] },
  { id: "python", displayName: "Python", version: "3.12", sourceExtension: "py", runCommandTemplate: "python main.py", imageIdentifier: "ghcr.io/campustest/runner-python:3.12.0", defaultTimeLimitMs: 2000, defaultMemoryLimitMb: 256, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: false, starterCode: "def solve():\n    pass\n", forbiddenConfigurationPatterns: ["subprocess", "os.system"] },
  { id: "javascript", displayName: "JavaScript", version: "Node 22", sourceExtension: "js", runCommandTemplate: "node main.js", imageIdentifier: "ghcr.io/campustest/runner-node:22.0.0", defaultTimeLimitMs: 2000, defaultMemoryLimitMb: 256, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: false, starterCode: "function solve() {}\n", forbiddenConfigurationPatterns: ["child_process", "worker_threads"] },
  { id: "typescript", displayName: "TypeScript", version: "5.9", sourceExtension: "ts", compilerCommandTemplate: "tsc main.ts", runCommandTemplate: "node main.js", imageIdentifier: "ghcr.io/campustest/runner-typescript:5.9.0", defaultTimeLimitMs: 2500, defaultMemoryLimitMb: 256, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: true, starterCode: "function solve(): void {}\n", forbiddenConfigurationPatterns: ["child_process", "worker_threads"] },
  { id: "go", displayName: "Go", version: "1.23", sourceExtension: "go", compilerCommandTemplate: "go build -o main main.go", runCommandTemplate: "./main", imageIdentifier: "ghcr.io/campustest/runner-go:1.23.0", defaultTimeLimitMs: 2500, defaultMemoryLimitMb: 256, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: true, starterCode: "package main\nfunc main() {}\n", forbiddenConfigurationPatterns: ["os/exec", "syscall"] },
  { id: "csharp", displayName: "C#", version: ".NET 8", sourceExtension: "cs", compilerCommandTemplate: "dotnet build", runCommandTemplate: "dotnet run --no-build", imageIdentifier: "ghcr.io/campustest/runner-dotnet:8.0.0", defaultTimeLimitMs: 3000, defaultMemoryLimitMb: 512, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: true, starterCode: "public class Program { public static void Main() {} }\n", forbiddenConfigurationPatterns: ["System.Diagnostics.Process"] },
  { id: "kotlin", displayName: "Kotlin", version: "2.0", sourceExtension: "kt", compilerCommandTemplate: "kotlinc Main.kt -include-runtime -d main.jar", runCommandTemplate: "java -jar main.jar", imageIdentifier: "ghcr.io/campustest/runner-kotlin:2.0.0", defaultTimeLimitMs: 3000, defaultMemoryLimitMb: 512, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: true, starterCode: "fun main() {}\n", forbiddenConfigurationPatterns: ["ProcessBuilder", "Runtime.getRuntime"] },
  { id: "rust", displayName: "Rust", version: "1.82", sourceExtension: "rs", compilerCommandTemplate: "rustc main.rs -O -o main", runCommandTemplate: "./main", imageIdentifier: "ghcr.io/campustest/runner-rust:1.82.0", defaultTimeLimitMs: 2500, defaultMemoryLimitMb: 256, defaultProcessLimit: 64, defaultOutputLimitBytes: 65536, enabled: true, compileRequired: true, starterCode: "fn main() {}\n", forbiddenConfigurationPatterns: ["std::process::Command"] },
];
