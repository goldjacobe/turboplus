import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import prompts from 'prompts';
import * as fuzzy from 'fuzzy';

export async function findTurboPackages(): Promise<string[]> {
  try {
    // Check if we're in a turbo repo by looking for turbo.json
    let currentDir = process.cwd();
    let rootDir = currentDir;
    
    // Find the root of the monorepo by looking for turbo.json
    while (!fs.existsSync(path.join(rootDir, 'turbo.json'))) {
      const parentDir = path.dirname(rootDir);
      if (parentDir === rootDir) {
        throw new Error('Not in a Turborepo. Please run this from a Turborepo project.');
      }
      rootDir = parentDir;
    }

    // Look for package.json files in the repository to find all packages
    const packageJsonFiles = findPackageJsonFiles(rootDir);
    
    // Extract package names from package.json files
    const packages = packageJsonFiles.map(file => {
      const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
      return packageJson.name || path.relative(rootDir, path.dirname(file));
    });

    return packages;
  } catch (error) {
    console.error('Error finding Turbo packages:', error);
    return [];
  }
}

function findPackageJsonFiles(dir: string): string[] {
  const results: string[] = [];
  
  // Check if this directory has a package.json
  const packageJsonPath = path.join(dir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    results.push(packageJsonPath);
  }
  
  // Look for workspaces configuration in package.json
  try {
    const rootPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const workspaces = rootPackageJson.workspaces;
    
    if (workspaces) {
      // Handle both array and object formats for workspaces
      const patterns = Array.isArray(workspaces) ? workspaces : workspaces.packages || [];
      
      // Find all directories matching workspace patterns
      patterns.forEach((pattern: string) => {
        const matches = findDirsMatchingGlob(dir, pattern);
        matches.forEach(matchDir => {
          const pkgPath = path.join(matchDir, 'package.json');
          if (fs.existsSync(pkgPath) && !results.includes(pkgPath)) {
            results.push(pkgPath);
          }
        });
      });
      
      // Don't recurse further if we found workspaces
      return results;
    }
  } catch (e) {
    // Continue if package.json can't be parsed
  }
  
  // Recursively check subdirectories
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        const subdir = path.join(dir, entry.name);
        const subdirResults = findPackageJsonFiles(subdir);
        results.push(...subdirResults);
      }
    }
  } catch (e) {
    // Skip directories we can't read
  }
  
  return results;
}

function findDirsMatchingGlob(baseDir: string, pattern: string): string[] {
  // Very simple glob implementation for common workspace patterns
  // This is a simplified version - a full implementation would use a proper glob library
  
  // Handle patterns like "packages/*"
  if (pattern.endsWith('/*')) {
    const dir = path.join(baseDir, pattern.slice(0, -2));
    try {
      if (fs.existsSync(dir)) {
        return fs.readdirSync(dir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => path.join(dir, dirent.name));
      }
    } catch (e) {}
    return [];
  }
  
  // For simplicity, just check if the exact directory exists
  const dir = path.join(baseDir, pattern);
  return fs.existsSync(dir) ? [dir] : [];
}

export async function runTurboCommand(command: string): Promise<void> {
  try {
    const packages = await findTurboPackages();
    
    if (packages.length === 0) {
      console.error('No packages found in this Turborepo.');
      return;
    }

    // Enable fuzzy searching
    const handleSuggestion = async (input = '', choices: any[]) => {
      if (!input) return choices;
      
      const results = fuzzy.filter(input, choices.map(c => c.title));
      return results
        .map(result => ({
          title: result.original,
          value: result.original
        }));
    };

    // Setup the prompt
    const response = await prompts({
      type: 'autocomplete',
      name: 'package',
      message: `Select package to run "turbo ${command}" on:`,
      choices: packages.map(pkg => ({ title: pkg, value: pkg })),
      suggest: handleSuggestion,
      hint: 'Start typing to filter packages'
    });

    // If user cancels with Ctrl+C
    if (!response.package) {
      console.log('Operation cancelled');
      return;
    }

    // Run the turbo command on the selected package
    const selectedPackage = response.package;
    console.log(`Running "turbo run ${command} --filter=${selectedPackage}"`);
    
    execSync(`turbo run ${command} --filter=${selectedPackage}`, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
  } catch (error) {
    console.error('Error running turbo command:', error);
  }
}