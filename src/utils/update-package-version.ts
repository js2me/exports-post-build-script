export const updatePackageVersion = (
  current: string | null,
  target?: 'major' | 'minor' | 'patch',
) => {
  if (!current) return '0.0.1';

  let [major, minor, patch] = current.split('.');

  switch (target) {
    case 'major': {
      {
        major = String(Number(major) + 1);
        minor = '0';
        patch = '0';
        break;
      }
    }
    case 'minor': {
      {
        minor = String(Number(minor) + 1);
        patch = '0';
        break;
      }
    }
    default: {
      patch = String(Number(patch) + 1);
      break;
    }
  }

  return [major, minor, patch].join('.');
};
