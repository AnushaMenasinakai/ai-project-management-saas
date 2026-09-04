process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test-placeholder';
process.env.JWT_SECRET = 'test-only-jwt-secret-that-is-not-used-outside-tests';
process.env.JWT_EXPIRES_IN = '1h';
process.env.GEMINI_API_KEY = 'test-only-gemini-placeholder';
process.env.EMBEDDING_MODEL = 'test-embedding-model';
process.env.GEMINI_MODEL = 'test-gemini-model';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';

const mockMongoose = require('mongoose');
const request = require('supertest');

const mockDatabase = {
  users: [],
  projects: [],
  tasks: [],
  documents: [],
  chunks: [],
};

const mockGenerateContent = jest.fn();
const mockEmbedContent = jest.fn();

const mockIdsEqual = (left, right) =>
  left !== undefined && right !== undefined && left.toString() === right.toString();

const mockProjectMatches = (project, query) => {
  if (query._id && !mockIdsEqual(project._id, query._id)) return false;
  if (query.owner && !mockIdsEqual(project.owner, query.owner)) return false;
  if (query.$or) {
    return query.$or.some((condition) =>
      condition.owner
        ? mockIdsEqual(project.owner, condition.owner)
        : project.members.some((memberId) => mockIdsEqual(memberId, condition.members))
    );
  }
  return true;
};

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn(() => ({
    models: {
      generateContent: mockGenerateContent,
      embedContent: mockEmbedContent,
    },
  })),
}));

jest.mock('../src/models/User', () => ({
  create: jest.fn(async (data) => {
    const user = { _id: new mockMongoose.Types.ObjectId(), ...data };
    mockDatabase.users.push(user);
    return user;
  }),
  findById: jest.fn(async (id) =>
    mockDatabase.users.find((user) => mockIdsEqual(user._id, id)) || null
  ),
  findOne: jest.fn(async ({ email }) =>
    mockDatabase.users.find((user) => user.email === email) || null
  ),
}));

jest.mock('../src/models/Project', () => ({
  create: jest.fn(async (data) => {
    const project = {
      _id: new mockMongoose.Types.ObjectId(),
      members: [],
      status: 'planning',
      ...data,
    };
    mockDatabase.projects.push(project);
    return project;
  }),
  find: jest.fn(async (query) =>
    mockDatabase.projects.filter((project) => mockProjectMatches(project, query))
  ),
  findOne: jest.fn(async (query) =>
    mockDatabase.projects.find((project) => mockProjectMatches(project, query)) || null
  ),
}));

jest.mock('../src/models/Document', () => {
  function MockDocument(data) {
    Object.assign(this, {
      _id: new mockMongoose.Types.ObjectId(),
      sourceType: 'text',
      ...data,
    });
  }

  MockDocument.prototype.save = jest.fn(async function save() {
    mockDatabase.documents.push(this);
    return this;
  });
  MockDocument.find = jest.fn((query) => ({
    sort: jest.fn(async () =>
      mockDatabase.documents.filter((document) => mockIdsEqual(document.project, query.project))
    ),
  }));
  MockDocument.findById = jest.fn(async (id) =>
    mockDatabase.documents.find((document) => mockIdsEqual(document._id, id)) || null
  );
  MockDocument.findByIdAndUpdate = jest.fn(async (id, updates) => {
    const document = mockDatabase.documents.find((item) => mockIdsEqual(item._id, id));
    if (!document) return null;
    Object.assign(document, updates);
    return document;
  });
  MockDocument.findByIdAndDelete = jest.fn(async (id) => {
    const index = mockDatabase.documents.findIndex((item) => mockIdsEqual(item._id, id));
    return index === -1 ? null : mockDatabase.documents.splice(index, 1)[0];
  });
  return MockDocument;
});

jest.mock('../src/models/DocumentChunk', () => ({
  find: jest.fn(async (query) =>
    mockDatabase.chunks.filter((chunk) => mockIdsEqual(chunk.project, query.project))
  ),
  insertMany: jest.fn(async (chunks) => {
    const stored = chunks.map((chunk) => ({
      _id: new mockMongoose.Types.ObjectId(),
      ...chunk,
    }));
    mockDatabase.chunks.push(...stored);
    return stored;
  }),
  deleteMany: jest.fn(async (query) => {
    mockDatabase.chunks = mockDatabase.chunks.filter((chunk) =>
      query.project
        ? !mockIdsEqual(chunk.project, query.project)
        : !mockIdsEqual(chunk.document, query.document)
    );
    return { acknowledged: true };
  }),
}));

jest.mock('../src/models/Task', () => ({
  insertMany: jest.fn(async (tasks) => {
    const stored = tasks.map((task) => ({
      _id: new mockMongoose.Types.ObjectId(),
      dependencies: [],
      ...task,
    }));
    mockDatabase.tasks.push(...stored);
    return stored;
  }),
  findByIdAndUpdate: jest.fn(async (id, updates) => {
    const task = mockDatabase.tasks.find((item) => mockIdsEqual(item._id, id));
    if (!task) return null;
    Object.assign(task, updates);
    return task;
  }),
  find: jest.fn((query) => {
    const tasks = mockDatabase.tasks.filter((task) =>
      query._id.$in.some((id) => mockIdsEqual(task._id, id))
    );
    const chain = {
      sort: jest.fn(() => chain),
      session: jest.fn(async () => tasks),
    };
    return chain;
  }),
  countDocuments: jest.fn(async () => 0),
  deleteMany: jest.fn(async () => ({ acknowledged: true })),
}));

jest.mock('../src/middleware/rateLimiters', () => ({
  authLimiter: (req, res, next) => next(),
  aiLimiter: (req, res, next) => next(),
}));

const mockSession = {
  endSession: jest.fn(async () => undefined),
  withTransaction: jest.fn(async (operation) => {
    const snapshot = {
      tasks: [...mockDatabase.tasks],
      documents: [...mockDatabase.documents],
      chunks: [...mockDatabase.chunks],
    };
    try {
      return await operation();
    } catch (error) {
      mockDatabase.tasks = snapshot.tasks;
      mockDatabase.documents = snapshot.documents;
      mockDatabase.chunks = snapshot.chunks;
      throw error;
    }
  }),
};

jest.spyOn(mockMongoose, 'startSession').mockImplementation(async () => mockSession);

const app = require('../src/app');
const DocumentChunk = require('../src/models/DocumentChunk');
const Task = require('../src/models/Task');

const OWNER = { name: 'AI Owner', email: 'ai-owner@test.local', password: 'password-123' };
const MEMBER = { name: 'AI Member', email: 'ai-member@test.local', password: 'password-123' };
const OUTSIDER = { name: 'AI Outsider', email: 'ai-outsider@test.local', password: 'password-123' };

const registerAndLogin = async (user) => {
  const registration = await request(app).post('/api/auth/register').send(user).expect(201);
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  return { token: login.body.token, user: registration.body.user };
};

const createFixture = async ({ description = 'Project context for deterministic tests.' } = {}) => {
  const owner = await registerAndLogin(OWNER);
  const member = await registerAndLogin(MEMBER);
  const outsider = await registerAndLogin(OUTSIDER);
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${owner.token}`)
    .send({ name: 'AI Regression Project', description, status: 'active' })
    .expect(201);
  const project = mockDatabase.projects.find((item) => mockIdsEqual(item._id, response.body.project._id));
  project.members.push(member.user.id);
  return { owner, member, outsider, project };
};

const createDocument = (token, projectId, overrides = {}) =>
  request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Architecture Notes',
      content: 'The API uses Express. MongoDB stores project data.',
      project: projectId,
      sourceType: 'text',
      ...overrides,
    });

const generatedTasks = () => ({
  tasks: [
    { id: 'task_1', title: 'Plan', description: 'Plan work', priority: 'high', dueDate: '2026-10-01', dependsOn: [] },
    { id: 'task_2', title: 'Design', description: 'Design work', priority: 'medium', dueDate: '2026-10-02', dependsOn: ['task_1'] },
    { id: 'task_3', title: 'Build', description: 'Build work', priority: 'high', dueDate: '2026-10-03', dependsOn: ['task_2'] },
    { id: 'task_4', title: 'Test', description: 'Test work', priority: 'medium', dueDate: '2026-10-04', dependsOn: ['task_3'] },
    { id: 'task_5', title: 'Release', description: 'Release work', priority: 'low', dueDate: '2026-10-05', dependsOn: ['task_4'] },
  ],
});

beforeEach(() => {
  Object.values(mockDatabase).forEach((collection) => collection.splice(0));
  jest.clearAllMocks();
  mockEmbedContent.mockResolvedValue({ embeddings: [{ values: [1, 0, 0] }] });
});

describe('document lifecycle regressions', () => {
  test('creates a project document with uploader ownership and embedded chunks', async () => {
    const { owner, project } = await createFixture();
    const response = await createDocument(owner.token, project._id).expect(201);

    expect(response.body.document).toMatchObject({
      title: 'Architecture Notes',
      project: project._id.toString(),
      uploadedBy: owner.user.id,
      sourceType: 'text',
    });
    expect(mockDatabase.chunks).toHaveLength(1);
    expect(mockDatabase.chunks[0]).toMatchObject({
      project: project._id.toString(),
      content: 'The API uses Express. MongoDB stores project data.',
      chunkIndex: 0,
      embedding: [1, 0, 0],
    });
  });

  test('replaces chunks when document content changes and removes them on delete', async () => {
    const { owner, project } = await createFixture();
    const created = await createDocument(owner.token, project._id).expect(201);
    const documentId = created.body.document._id;

    await request(app)
      .patch(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ content: 'Updated project knowledge replaces the old chunk.' })
      .expect(200);

    expect(mockDatabase.chunks).toHaveLength(1);
    expect(mockDatabase.chunks[0].content).toBe('Updated project knowledge replaces the old chunk.');

    await request(app)
      .delete(`/api/documents/${documentId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(mockDatabase.documents).toHaveLength(0);
    expect(mockDatabase.chunks).toHaveLength(0);
  });

  test('rolls back the document when chunk persistence fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { owner, project } = await createFixture();
    DocumentChunk.insertMany.mockRejectedValueOnce(new Error('chunk write failed'));

    await createDocument(owner.token, project._id).expect(500);

    expect(mockDatabase.documents).toHaveLength(0);
    expect(mockDatabase.chunks).toHaveLength(0);
    expect(mockSession.endSession).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('project RAG regressions', () => {
  test.each(['owner', 'member'])('allows an authorized %s to ask using retrieved context', async (role) => {
    const fixture = await createFixture();
    const created = await createDocument(fixture.owner.token, fixture.project._id).expect(201);
    mockGenerateContent.mockResolvedValueOnce({ text: 'The project API uses Express.' });

    const response = await request(app)
      .post(`/api/projects/${fixture.project._id}/ask`)
      .set('Authorization', `Bearer ${fixture[role].token}`)
      .send({ question: 'Which framework powers the API?' })
      .expect(200);

    expect(response.body).toMatchObject({
      question: 'Which framework powers the API?',
      answer: 'The project API uses Express.',
      sources: [expect.objectContaining({
        documentId: created.body.document._id,
        title: 'Architecture Notes',
        score: 1,
        content: 'The API uses Express. MongoDB stores project data.',
      })],
    });
    expect(mockGenerateContent.mock.calls[0][0].contents).toContain('The API uses Express');
  });

  test.each([undefined, null, '', '   ', 42, {}, []])('rejects invalid question value %p', async (question) => {
    const { owner, project } = await createFixture();
    await request(app)
      .post(`/api/projects/${project._id}/ask`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send(question === undefined ? {} : { question })
      .expect(400, { message: 'Question is required.' });
    expect(mockEmbedContent).not.toHaveBeenCalled();
  });

  test('keeps Q&A hidden from an unrelated authenticated user', async () => {
    const { outsider, project } = await createFixture();
    await request(app)
      .post(`/api/projects/${project._id}/ask`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ question: 'What is private?' })
      .expect(404, { message: 'Project not found.' });
    expect(mockEmbedContent).not.toHaveBeenCalled();
  });

  test('returns the normal no-information response without calling AI for an empty project', async () => {
    const { owner, project } = await createFixture();
    const response = await request(app)
      .post(`/api/projects/${project._id}/ask`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ question: 'What documents exist?' })
      .expect(200);

    expect(response.body).toMatchObject({
      answer: 'I could not find relevant information in the project documents.',
      sources: [],
    });
    expect(mockEmbedContent).not.toHaveBeenCalled();
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});

describe('AI task generation regressions', () => {
  test.each(['owner', 'member'])('persists valid generated tasks and dependencies for %s', async (role) => {
    const fixture = await createFixture({ description: '' });
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(generatedTasks()) });

    const response = await request(app)
      .post(`/api/projects/${fixture.project._id}/ai/generate-tasks`)
      .set('Authorization', `Bearer ${fixture[role].token}`)
      .expect(201);

    expect(response.body.message).toBe('AI tasks generated successfully.');
    expect(response.body.tasks).toHaveLength(5);
    expect(mockDatabase.tasks).toHaveLength(5);
    expect(mockDatabase.tasks[1].dependencies).toEqual([mockDatabase.tasks[0]._id]);
    expect(mockGenerateContent.mock.calls[0][0].contents).toContain(
      'Project description: No project description was provided.'
    );
  });

  test('rejects an unrelated user before invoking Gemini', async () => {
    const { outsider, project } = await createFixture();
    await request(app)
      .post(`/api/projects/${project._id}/ai/generate-tasks`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404, { message: 'Project not found.' });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  test('rejects cyclic generated dependencies before persistence', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { owner, project } = await createFixture();
    const cyclic = generatedTasks();
    cyclic.tasks[0].dependsOn = ['task_2'];
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(cyclic) });

    await request(app)
      .post(`/api/projects/${project._id}/ai/generate-tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(500, { message: 'Failed to generate AI tasks.' });

    expect(Task.insertMany).not.toHaveBeenCalled();
    expect(mockDatabase.tasks).toHaveLength(0);
    consoleError.mockRestore();
  });

  test('handles malformed AI output without persisting tasks', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { owner, project } = await createFixture();
    mockGenerateContent.mockResolvedValueOnce({ text: 'not json' });

    await request(app)
      .post(`/api/projects/${project._id}/ai/generate-tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(500, { message: 'Failed to generate AI tasks.' });

    expect(Task.insertMany).not.toHaveBeenCalled();
    expect(mockDatabase.tasks).toHaveLength(0);
    consoleError.mockRestore();
  });

  test('rolls back all generated tasks when dependency persistence fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { owner, project } = await createFixture();
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(generatedTasks()) });
    Task.findByIdAndUpdate.mockRejectedValueOnce(new Error('dependency write failed'));

    await request(app)
      .post(`/api/projects/${project._id}/ai/generate-tasks`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(500, { message: 'Failed to generate AI tasks.' });

    expect(mockDatabase.tasks).toHaveLength(0);
    expect(mockSession.endSession).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
