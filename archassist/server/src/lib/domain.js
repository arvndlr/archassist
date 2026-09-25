// Shared vocabulary for Archassist: quality attributes, project types, and
// the input options a student can choose from.

export const QUALITY_ATTRIBUTES = [
  { key: 'performance',      label: 'Performance',       description: 'Fast response times and efficient resource use under expected load.' },
  { key: 'scalability',      label: 'Scalability',       description: 'Ability to handle growth in users, data, or traffic.' },
  { key: 'availability',     label: 'Availability',      description: 'System stays up and recovers quickly from failures.' },
  { key: 'security',         label: 'Security',          description: 'Protects data and functions from unauthorized access.' },
  { key: 'maintainability',  label: 'Maintainability',   description: 'Easy to understand, fix, and change over time.' },
  { key: 'testability',      label: 'Testability',       description: 'Components can be tested in isolation and automatically.' },
  { key: 'interoperability', label: 'Interoperability',  description: 'Works with external systems, devices, and APIs.' },
  { key: 'deployability',    label: 'Deployability',     description: 'Easy and safe to release, update, and roll back.' },
  { key: 'cost_efficiency',  label: 'Cost efficiency',   description: 'Low hosting, infrastructure, and operating cost.' },
  { key: 'simplicity',       label: 'Development simplicity', description: 'Fits the team\'s skill level and deadline; low learning curve.' },
];

export const QA_KEYS = QUALITY_ATTRIBUTES.map((q) => q.key);
export const QA_LABEL = Object.fromEntries(QUALITY_ATTRIBUTES.map((q) => [q.key, q.label]));

export const PROJECT_TYPES = [
  { key: 'web',        label: 'Web application' },
  { key: 'mobile',     label: 'Mobile application' },
  { key: 'desktop',    label: 'Desktop application' },
  { key: 'iot',        label: 'IoT / embedded system' },
  { key: 'ai_ml',      label: 'AI / ML-powered system' },
  { key: 'data',       label: 'Data processing / analytics' },
  { key: 'game',       label: 'Game' },
  { key: 'enterprise', label: 'Enterprise / information system' },
];

export const EXPECTED_USERS = [
  { key: 'small',   label: 'Under 100' },
  { key: 'medium',  label: '100 – 10,000' },
  { key: 'large',   label: 'Over 10,000' },
];

export const TEAM_EXPERIENCE = [
  { key: 'beginner',     label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced',     label: 'Advanced' },
];

export const DEPLOYMENT = [
  { key: 'local',  label: 'Local / on-premise' },
  { key: 'cloud',  label: 'Cloud' },
  { key: 'hybrid', label: 'Hybrid' },
  { key: 'device', label: 'On device / edge' },
];

export const keysOf = (list) => list.map((x) => x.key);
