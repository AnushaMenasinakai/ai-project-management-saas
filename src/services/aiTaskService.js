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

  result.tasks.forEach((task) => {
    const expectedFields = ['title', 'description', 'priority', 'dueDate'];

    if (
      !task ||
      typeof task !== 'object' ||
      Array.isArray(task) ||
      Object.keys(task).length !== expectedFields.length ||
      !expectedFields.every((field) => Object.hasOwn(task, field)) ||
      typeof task.title !== 'string' ||
      !task.title.trim() ||
      typeof task.description !== 'string' ||
      !task.description.trim() ||
      !allowedPriorities.includes(task.priority) ||
      !isValidDate(task.dueDate)
    ) {
      throw new Error('AI returned an invalid task.');
    }
  });

  return result;
};

const generateProjectTasks = async (projectName, projectDescription) => {
  if (
    typeof projectName !== 'string' ||
    !projectName.trim() ||
    typeof projectDescription !== 'string' ||
    !projectDescription.trim()
  ) {
    throw new Error('Project name and project description are required.');
  }

  const prompt = `
Generate 5 to 10 actionable tasks for this project.

Project name: ${projectName.trim()}
Project description: ${projectDescription.trim()}

Return JSON only, with no markdown or explanation, in exactly this shape:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "low | medium | high",
      "dueDate": "YYYY-MM-DD"
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
