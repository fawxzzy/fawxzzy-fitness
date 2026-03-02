import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const bumpType = process.argv[2];
if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('Usage: node scripts/release.mjs <patch|minor|major>');
  process.exit(1);
}

function runInherit(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Invalid version: ${version}. Expected SemVer format X.Y.Z`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function bumpVersion(currentVersion, type) {
  const next = parseVersion(currentVersion);

  if (type === 'patch') {
    next.patch += 1;
  }

  if (type === 'minor') {
    next.minor += 1;
    next.patch = 0;
  }

  if (type === 'major') {
    next.major += 1;
    next.minor = 0;
    next.patch = 0;
  }

  return `${next.major}.${next.minor}.${next.patch}`;
}

function todayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const repoRoot = process.cwd();
const packageJsonPath = path.join(repoRoot, 'package.json');
const changelogPath = path.join(repoRoot, 'docs', 'CHANGELOG.md');

if (!fs.existsSync(packageJsonPath)) {
  throw new Error('package.json not found at repository root.');
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (!packageJson.version) {
  packageJson.version = '0.1.0';
}

const currentVersion = String(packageJson.version);
const nextVersion = bumpVersion(currentVersion, bumpType);
const releaseTag = `v${nextVersion}`;

packageJson.version = nextVersion;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

const changelogTitle = '# Changelog';
const changelogIntro = 'All notable changes to this project are documented in this file.';

let changelog = '';
if (fs.existsSync(changelogPath)) {
  changelog = fs.readFileSync(changelogPath, 'utf8');
} else {
  fs.mkdirSync(path.dirname(changelogPath), { recursive: true });
}

if (!changelog.trim()) {
  changelog = `${changelogTitle}\n\n${changelogIntro}\n\n`;
} else if (!changelog.startsWith(changelogTitle)) {
  changelog = `${changelogTitle}\n\n${changelogIntro}\n\n${changelog.trimStart()}`;
}

const releaseHeading = `## ${nextVersion} — ${todayISO()}`;
if (changelog.includes(releaseHeading)) {
  console.error(`docs/CHANGELOG.md already contains ${releaseHeading}`);
  process.exit(1);
}

const releaseEntry = `${releaseHeading}\n\n### WHAT\n- (fill in)\n\n### WHY\n- (fill in)\n\n`;

const introBlock = `${changelogTitle}\n\n${changelogIntro}`;
if (changelog.startsWith(introBlock)) {
  changelog = `${introBlock}\n\n${releaseEntry}${changelog.slice(introBlock.length).replace(/^\n+/, '')}`;
} else {
  const firstBlankLine = changelog.indexOf('\n\n');
  const insertAt = firstBlankLine === -1 ? changelog.length : firstBlankLine + 2;
  changelog = `${changelog.slice(0, insertAt)}${releaseEntry}${changelog.slice(insertAt)}`;
}

fs.writeFileSync(changelogPath, changelog.replace(/\n{3,}/g, '\n\n'));

runInherit('git add package.json docs/CHANGELOG.md');
runInherit(`git commit -m "chore(release): ${releaseTag}"`);
runInherit(`git tag -a ${releaseTag} -m "Release ${releaseTag}"`);
runInherit('git push');
runInherit(`git push origin ${releaseTag}`);

console.log(`✅ Released ${releaseTag} (${currentVersion} → ${nextVersion})`);
