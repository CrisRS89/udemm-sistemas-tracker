export const validateCatalog = (catalog) => {
  const ids = new Set();
  const duplicateIds = [];
  const subjectIds = new Set(catalog.subjects.map((subject) => subject.id));
  const missingPrerequisites = [];

  for (const subject of catalog.subjects) {
    if (ids.has(subject.id)) duplicateIds.push(subject.id);
    ids.add(subject.id);
    for (const prerequisite of subject.prereqs || []) {
      if (!subjectIds.has(prerequisite)) {
        missingPrerequisites.push({ subjectId: subject.id, prerequisite });
      }
    }
  }

  return { duplicateIds, missingPrerequisites };
};
