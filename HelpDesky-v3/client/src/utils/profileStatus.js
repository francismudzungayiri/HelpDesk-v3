export const PROFILE_STATUS_OPTIONS = [
  {
    value: 'AVAILABLE',
    label: 'Available',
    description: 'If you are available at work.',
    toneClass: 'available'
  },
  {
    value: 'ON_LEAVE',
    label: 'On leave',
    description: 'Not available for work.',
    toneClass: 'on-leave'
  },
  {
    value: 'AT_WORKSHOP',
    label: 'At workshop',
    description: 'Doing work away.',
    toneClass: 'at-workshop'
  }
];

export const DEFAULT_WORK_STATUS = 'AVAILABLE';

export const getProfileStatusStorageKey = (userId) => `helpdesky.profileStatus:${userId ?? 'unknown'}`;

export const normalizeWorkStatus = (value) => {
  if (PROFILE_STATUS_OPTIONS.some((option) => option.value === value)) {
    return value;
  }
  return DEFAULT_WORK_STATUS;
};

export const readWorkStatus = (userId) => {
  const storageKey = getProfileStatusStorageKey(userId);
  return normalizeWorkStatus(localStorage.getItem(storageKey));
};

export const getWorkStatusMeta = (statusValue) =>
  PROFILE_STATUS_OPTIONS.find((option) => option.value === statusValue) || PROFILE_STATUS_OPTIONS[0];
