import { readFileSync } from 'node:fs';

export const getInfoFromChangelog = (
  version: string,
  pathToChangelog: string,
  repoUrl: string,
) => {
  const changelogContent = readFileSync(pathToChangelog, {
    encoding: 'utf8',
  }).toString();

  const contentLines = changelogContent.split('\n## ');

  const currentVersionContentLines = contentLines.find((line) =>
    line.startsWith(version.replace('v', '')),
  )!;

  const prevVersion =
    contentLines[contentLines.indexOf(currentVersionContentLines) + 1]?.split(
      '\n\n',
    )?.[0];

  const whatChangesLines = currentVersionContentLines
    .split('###')
    .slice(1)
    .map((str) => `###${str}`);

  if (prevVersion) {
    whatChangesLines.push(
      `Changes: ${repoUrl}/compare/${prevVersion}...${version}`,
    );
  } else {
    whatChangesLines.push(`Changes: ${repoUrl}/compare/...${version}`);
  }

  const whatChangesText = whatChangesLines.join('\n');

  return {
    prevVersion,
    whatChangesText,
  };
};
