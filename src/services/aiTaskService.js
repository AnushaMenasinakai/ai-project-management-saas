const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const allowedPriorities = ['low', 'medium', 'high'];

const isValidDate = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const validateGeneratedTasks = (result) => {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('AI returned an invalid task response.');
  }

  if (Object.keys(result).length !== 1 || !Array.isArray(result.tasks)) {
    throw new Error('AI task response must contain only a tasks array.');
  }

  if (result.tasks.length < 5 || result.tasks.length > 10) {
    throw new Error('AI task response must contain between 5 and 10 tasks.');
  }

  const taskIds = new Set();

  result.tasks.forEach((task) => {
    const expectedFields = [
      'id',
      'title',
      'description',
      'priority',
      'dueDate',
      'dependsOn',
    ];

    if (
      !task ||
      typeof task !== 'object' ||
      Array.isArray(task) ||
      Object.keys(task).length !== expectedFields.length ||
      !expectedFields.every((field) => Object.hasOwn(task, field)) ||
      typeof task.id !== 'string' ||
      !task.id.trim() ||
      typeof task.title !== 'string' ||
      !task.title.trim() ||
      typeof task.description !== 'string' ||
      !task.description.trim() ||
      !allowedPriorities.includes(task.priority) ||
      !isValidDate(task.dueDate) ||
      !Array.isArray(task.dependsOn) ||
      !task.dependsOn.every(
        (dependencyId) =>
          typeof dependencyId === 'string' && dependencyId.trim()
      )
    ) {
      throw new Error('AI returned an invalid task.');
    }

    if (taskIds.has(task.id)) {
      throw new Error('AI returned duplicate task IDs.');
    }

    taskIds.add(task.id);
  });

  result.tasks.forEach((task) => {
    task.dependsOn.forEach((dependencyId) => {
      if (!taskIds.has(dependencyId)) {
        throw new Error(
          `AI task ${task.id} references an unknown dependency.`
        );
      }

      if (dependencyId === task.id) {
        throw new Error(
          `AI task ${task.id} cannot depend on itself.`
        );
      }
    });
  });

  const dependenciesByTask = new Map(
    result.tasks.map((task) => [task.id, task.dependsOn])
  );
  const visiting = new Set();
  const visited = new Set();

  const hasCycle = (taskId) => {
    if (visiting.has(taskId)) {
      return true;
    }

    if (visited.has(taskId)) {
      return false;
    }

    visiting.add(taskId);

    for (const dependencyId of dependenciesByTask.get(taskId)) {
      if (hasCycle(dependencyId)) {
        return true;
      }
    }

    visiting.delete(taskId);
    visited.add(taskId);
    return false;
  };

  if (result.tasks.some((task) => hasCycle(task.id))) {
    throw new Error('AI task dependencies cannot contain a cycle.');
  }

  return result;
};

const generateProjectTasks = async (projectName, projectDescription) => {
  if (typeof projectName !== 'string' || !projectName.trim()) {
    throw new Error('Project name is required.');
  }

  const normalizedDescription =
    typeof projectDescription === 'string' && projectDescription.trim()
      ? projectDescription.trim()
      : 'No project description was provided.';

  const prompt = `
Generate 5 to 10 actionable tasks for this project.

Project name: ${projectName.trim()}
Project description: ${normalizedDescription}

Each task must have a unique temporary ID such as task_1, task_2, task_3.
dependsOn must contain only IDs of other tasks in this response.
Use an empty array when a task has no dependencies.
Do not create circular dependencies.
Do not use MongoDB ObjectIds.

Return JSON only, with no markdown or explanation, in exactly this shape:
{
"tasks": [
{
"id": "task_1",
"title": "string",
"description": "string",
"priority": "low | medium | high",
"dueDate": "YYYY-MM-DD",
"dependsOn": []
}
]
}
`;

  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
    },
  });

  let result;

  try {
    result = JSON.parse(response.text);
  } catch (error) {
    throw new Error('AI returned invalid JSON.');
  }

  return validateGeneratedTasks(result);
};

module.exports = {
  generateProjectTasks,
};
