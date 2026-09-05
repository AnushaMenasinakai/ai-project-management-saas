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
  comments: [],
};

const mockIdsEqual = (left, right) =>
  left !== undefined && right !== undefined && left.toString() === right.toString();

const mockProjectMatches = (project, query) => {
  if (query._id && !mockIdsEqual(project._id, query._id)) return false;
  if (query.owner && !mockIdsEqual(project.owner, query.owner)) return false;

  if (query.$or) {
    return query.$or.some((condition) => {
      if (condition.owner) return mockIdsEqual(project.owner, condition.owner);
      if (condition.members) {
        return project.members.some((memberId) => mockIdsEqual(memberId, condition.members));
      }
      return false;
    });
  }

  return true;
};

jest.mock('../src/models/User', () => ({
  create: jest.fn(async (data) => {
    const now = new Date();
    const user = {
      _id: new mockMongoose.Types.ObjectId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
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
    const now = new Date();
    const project = {
      _id: new mockMongoose.Types.ObjectId(),
      members: [],
      status: 'planning',
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    project.save = jest.fn(async () => project);
    project.toObject = () => ({ ...project, save: undefined, toObject: undefined });
    mockDatabase.projects.push(project);
    return project;
  }),
  find: jest.fn(async (query) =>
    mockDatabase.projects.filter((project) => mockProjectMatches(project, query))
  ),
  findOne: jest.fn((query) => {
    const project =
      mockDatabase.projects.find((candidate) =>
        mockProjectMatches(candidate, query)
      ) || null;
    const result = Promise.resolve(project);
    result.populate = jest.fn(async () => {
      if (!project) return null;
      return {
        ...project,
        members: project.members.map((memberId) => {
          const user = mockDatabase.users.find((candidate) =>
            mockIdsEqual(candidate._id, memberId)
          );
          return user && { _id: user._id, name: user.name, email: user.email };
        }),
      };
    });
    return result;
  }),
  findOneAndUpdate: jest.fn(async (query, updates) => {
    const project =
      mockDatabase.projects.find((candidate) =>
        mockProjectMatches(candidate, query)
      ) || null;
    if (!project) return null;
    Object.assign(project, updates, { updatedAt: new Date() });
    return project;
  }),
  deleteOne: jest.fn(async (query) => {
    const index = mockDatabase.projects.findIndex((project) =>
      mockProjectMatches(project, query)
    );
    if (index !== -1) mockDatabase.projects.splice(index, 1);
    return { acknowledged: true, deletedCount: index === -1 ? 0 : 1 };
  }),
}));

jest.mock('../src/models/Task', () => ({
  countDocuments: jest.fn(async (query) =>
    mockDatabase.tasks.filter(
      (task) =>
        mockIdsEqual(task.project, query.project) &&
        (!query.status || task.status === query.status)
    ).length
  ),
  create: jest.fn(async (data) => {
    const now = new Date();
    const task = {
      _id: new mockMongoose.Types.ObjectId(),
      status: 'todo',
      priority: 'medium',
      dependencies: [],
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    mockDatabase.tasks.push(task);
    return task;
  }),
  find: jest.fn((query) => {
    const tasks = mockDatabase.tasks.filter(
      (task) =>
        (!query.project || mockIdsEqual(task.project, query.project)) &&
        (!query._id?.$in || query._id.$in.some((id) => mockIdsEqual(task._id, id)))
    );
    const result = {
      populate: jest.fn(() => result),
      select: jest.fn(async () => tasks),
      sort: jest.fn(async () => tasks),
    };
    return result;
  }),
  findById: jest.fn(async (id) =>
    mockDatabase.tasks.find((task) => mockIdsEqual(task._id, id)) || null
  ),
  findByIdAndDelete: jest.fn(async (id) => {
    const index = mockDatabase.tasks.findIndex((task) => mockIdsEqual(task._id, id));
    return index === -1 ? null : mockDatabase.tasks.splice(index, 1)[0];
  }),
  findByIdAndUpdate: jest.fn(async (id, updates) => {
    const task = mockDatabase.tasks.find((candidate) => mockIdsEqual(candidate._id, id));
    if (!task) return null;
    Object.assign(task, updates, { updatedAt: new Date() });
    return task;
  }),
  updateMany: jest.fn(async (query) => {
    mockDatabase.tasks.forEach((task) => {
      if (mockIdsEqual(task.project, query.project)) {
        task.dependencies = task.dependencies.filter(
          (dependencyId) => !mockIdsEqual(dependencyId, query.dependencies)
        );
      }
    });
    return { acknowledged: true };
  }),
  deleteMany: jest.fn(async (query) => {
    mockDatabase.tasks = mockDatabase.tasks.filter(
      (task) => !mockIdsEqual(task.project, query.project)
    );
    return { acknowledged: true };
  }),
}));

jest.mock('../src/models/Document', () => {
  function MockDocument(data) {
    Object.assign(this, {
      _id: new mockMongoose.Types.ObjectId(),
      sourceType: 'text',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  MockDocument.prototype.save = jest.fn(async function save() {
    mockDatabase.documents.push(this);
    return this;
  });
  MockDocument.find = jest.fn((query) => ({
    sort: jest.fn(async () =>
      mockDatabase.documents.filter((document) =>
        mockIdsEqual(document.project, query.project)
      )
    ),
  }));
  MockDocument.findById = jest.fn(async (id) =>
    mockDatabase.documents.find((document) => mockIdsEqual(document._id, id)) || null
  );
  MockDocument.findByIdAndUpdate = jest.fn(async (id, updates) => {
    const document = mockDatabase.documents.find((candidate) =>
      mockIdsEqual(candidate._id, id)
    );
    if (!document) return null;
    Object.assign(document, updates, { updatedAt: new Date() });
    return document;
  });
  MockDocument.findByIdAndDelete = jest.fn(async (id) => {
    const index = mockDatabase.documents.findIndex((document) =>
      mockIdsEqual(document._id, id)
    );
    return index === -1 ? null : mockDatabase.documents.splice(index, 1)[0];
  });
  MockDocument.deleteMany = jest.fn(async (query) => {
    mockDatabase.documents = mockDatabase.documents.filter(
      (document) => !mockIdsEqual(document.project, query.project)
    );
    return { acknowledged: true };
  });

  return MockDocument;
});

jest.mock('../src/models/DocumentChunk', () => ({
  deleteMany: jest.fn(async (query) => {
    mockDatabase.chunks = mockDatabase.chunks.filter((chunk) => {
      if (query.project) return !mockIdsEqual(chunk.project, query.project);
      return !mockIdsEqual(chunk.document, query.document);
    });
    return { acknowledged: true };
  }),
  insertMany: jest.fn(async (chunks) => {
    mockDatabase.chunks.push(...chunks);
    return chunks;
  }),
}));

jest.mock('../src/models/Comment', () => {
  const hydrate = (storedComment) => {
    if (!storedComment) return null;

    const comment = { ...storedComment };
    comment.save = jest.fn(async () => {
      storedComment.content = comment.content;
      storedComment.updatedAt = new Date();
      comment.updatedAt = storedComment.updatedAt;
      return comment;
    });
    comment.populate = jest.fn(async () => {
      const authorId = storedComment.author;
      const author = mockDatabase.users.find((user) => mockIdsEqual(user._id, authorId));
      comment.author = author ? { _id: author._id, name: author.name } : null;
      return comment;
    });
    return comment;
  };

  return {
    create: jest.fn(async (data) => {
      const now = new Date();
      const storedComment = {
        _id: new mockMongoose.Types.ObjectId(),
        ...data,
        createdAt: now,
        updatedAt: now,
      };
      mockDatabase.comments.push(storedComment);
      return hydrate(storedComment);
    }),
    find: jest.fn((query) => {
      const matching = mockDatabase.comments.filter((comment) =>
        mockIdsEqual(comment.task, query.task) && mockIdsEqual(comment.project, query.project)
      );
      const chain = {
        sort: jest.fn(() => chain),
        populate: jest.fn(async () => Promise.all(
          [...matching]
            .sort((left, right) => left.createdAt - right.createdAt || left._id.toString().localeCompare(right._id.toString()))
            .map(async (comment) => {
              const hydrated = hydrate(comment);
              await hydrated.populate();
              return hydrated;
            })
        )),
      };
      return chain;
    }),
    findById: jest.fn(async (id) => hydrate(
      mockDatabase.comments.find((comment) => mockIdsEqual(comment._id, id)) || null
    )),
    deleteOne: jest.fn(async (query) => {
      const index = mockDatabase.comments.findIndex((comment) => mockIdsEqual(comment._id, query._id));
      if (index !== -1) mockDatabase.comments.splice(index, 1);
      return { acknowledged: true, deletedCount: index === -1 ? 0 : 1 };
    }),
    deleteMany: jest.fn(async (query) => {
      mockDatabase.comments = mockDatabase.comments.filter((comment) => {
        if (query.task && !mockIdsEqual(comment.task, query.task)) return true;
        if (query.project && !mockIdsEqual(comment.project, query.project)) return true;
        return false;
      });
      return { acknowledged: true };
    }),
  };
});

jest.mock('../src/services/embeddingService', () => ({
  generateEmbedding: jest.fn(async () => [0.25, 0.5, 0.75]),
}));

jest.mock('../src/middleware/rateLimiters', () => ({
  authLimiter: (req, res, next) => next(),
  aiLimiter: (req, res, next) => next(),
}));

jest.spyOn(mockMongoose, 'startSession').mockResolvedValue({
  endSession: jest.fn(async () => undefined),
  withTransaction: jest.fn(async (operation) => {
    const snapshot = {
      projects: mockDatabase.projects.map((project) => ({ ...project, members: [...project.members] })),
      tasks: mockDatabase.tasks.map((task) => ({ ...task, dependencies: [...task.dependencies] })),
      documents: mockDatabase.documents.map((document) => ({ ...document })),
      chunks: mockDatabase.chunks.map((chunk) => ({ ...chunk })),
      comments: mockDatabase.comments.map((comment) => ({ ...comment })),
    };

    try {
      return await operation();
    } catch (error) {
      Object.assign(mockDatabase, snapshot);
      throw error;
    }
  }),
});

const app = require('../src/app');

const OWNER = {
  name: 'Test Owner',
  email: 'owner@test.local',
  password: 'test-password-123',
};

const MEMBER = {
  name: 'Test Member',
  email: 'member@test.local',
  password: 'test-password-123',
};

const OUTSIDER = {
  name: 'Test Outsider',
  email: 'outsider@test.local',
  password: 'test-password-123',
};

const clearDatabase = async () => {
  mockDatabase.users.length = 0;
  mockDatabase.projects.length = 0;
  mockDatabase.tasks.length = 0;
  mockDatabase.documents.length = 0;
  mockDatabase.chunks.length = 0;
  mockDatabase.comments.length = 0;
};

const registerAndLogin = async (user = OWNER) => {
  const registrationResponse = await request(app)
    .post('/api/auth/register')
    .send(user)
    .expect(201);

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);

  return {
    token: loginResponse.body.token,
    user: registrationResponse.body.user,
  };
};

const createOwnedProject = async (token) => {
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Smoke Test Project',
      description: 'Disposable project data for the backend smoke suite.',
      status: 'active',
    })
    .expect(201);

  return response.body.project;
};

const createCollaborationFixture = async () => {
  const owner = await registerAndLogin(OWNER);
  const member = await registerAndLogin(MEMBER);
  const outsider = await registerAndLogin(OUTSIDER);
  const project = await createOwnedProject(owner.token);
  const storedProject = mockDatabase.projects.find((candidate) =>
    mockIdsEqual(candidate._id, project._id)
  );
  storedProject.members.push(member.user.id);

  return { member, outsider, owner, project, storedProject };
};

const createProjectTask = async (token, projectId, title = 'Permission test task') => {
  const response = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title, project: projectId })
    .expect(201);

  return response.body.task;
};

const createProjectDocument = async (token, projectId) => {
  const response = await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Permission Test Document',
      content: 'Deterministic document content used only by the permission suite.',
      project: projectId,
      sourceType: 'text',
    })
    .expect(201);

  return response.body.document;
};

const createTaskComment = async (token, taskId, content = 'Initial project update.') => {
  const response = await request(app)
    .post(`/api/tasks/${taskId}/comments`)
    .set('Authorization', `Bearer ${token}`)
    .send({ content })
    .expect(201);

  return response.body.comment;
};

afterEach(clearDatabase);

describe('authentication API smoke tests', () => {
  test('registers a valid user without returning the password hash', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(OWNER)
      .expect(201);

    expect(response.body).toMatchObject({
      message: 'User registered successfully.',
      user: {
        name: OWNER.name,
        email: OWNER.email,
      },
    });
    expect(response.body.user.id).toBeTruthy();
    expect(response.body.user).not.toHaveProperty('password');
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  test('rejects a duplicate email address', async () => {
    await request(app).post('/api/auth/register').send(OWNER).expect(201);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...OWNER, name: 'Duplicate Owner' })
      .expect(409);

    expect(response.body.message).toMatch(/already exists/i);
  });

  test('logs in with valid credentials and returns the auth shape', async () => {
    await request(app).post('/api/auth/register').send(OWNER).expect(201);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: OWNER.email, password: OWNER.password })
      .expect(200);

    expect(typeof response.body.token).toBe('string');
    expect(response.body.token).not.toHaveLength(0);
    expect(response.body.user).toMatchObject({
      name: OWNER.name,
      email: OWNER.email,
    });
    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  test('rejects invalid login credentials', async () => {
    await request(app).post('/api/auth/register').send(OWNER).expect(201);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: OWNER.email, password: 'wrong-password' })
      .expect(401);

    expect(response.body.message).toBe('Invalid email or password.');
  });

  test('rejects an unauthenticated protected request', async () => {
    const response = await request(app).get('/api/projects').expect(401);

    expect(response.body.message).toMatch(/authorization token/i);
  });
});

describe('project API smoke tests', () => {
  test('creates, lists, and retrieves a project owned by the authenticated user', async () => {
    const { token, user } = await registerAndLogin();
    const project = await createOwnedProject(token);

    expect(project.owner.toString()).toBe(user.id.toString());

    const listResponse = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listResponse.body.projects).toHaveLength(1);
    expect(listResponse.body.projects[0]).toMatchObject({
      _id: project._id,
      name: project.name,
      owner: user.id,
    });

    const retrievalResponse = await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(retrievalResponse.body.project._id).toBe(project._id);
  });

  test('rejects unauthenticated project creation', async () => {
    await request(app)
      .post('/api/projects')
      .send({ name: 'Unauthorized Project' })
      .expect(401);
  });
});

describe('task API smoke tests', () => {
  test('lets the project owner create and update a project task', async () => {
    const { token } = await registerAndLogin();
    const project = await createOwnedProject(token);

    const createResponse = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Create the smoke-test baseline',
        description: 'Exercise the normal task API.',
        project: project._id,
        priority: 'high',
      })
      .expect(201);

    expect(createResponse.body.task.project.toString()).toBe(project._id);

    const updateResponse = await request(app)
      .patch(`/api/tasks/${createResponse.body.task._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Updated smoke-test task', status: 'in_progress' })
      .expect(200);

    expect(updateResponse.body.task).toMatchObject({
      title: 'Updated smoke-test task',
      status: 'in_progress',
    });
  });

  test('lets the project owner delete a task and removes it', async () => {
    const { token } = await registerAndLogin();
    const project = await createOwnedProject(token);
    const createResponse = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Delete this smoke-test task', project: project._id })
      .expect(201);

    const taskId = createResponse.body.task._id;

    await request(app)
      .delete(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app)
      .get(`/api/tasks/${taskId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  test('rejects unauthenticated task mutations', async () => {
    const taskId = new mockMongoose.Types.ObjectId().toString();
    const projectId = new mockMongoose.Types.ObjectId().toString();

    await request(app)
      .post('/api/tasks')
      .send({ title: 'Unauthorized task', project: projectId })
      .expect(401);

    await request(app)
      .patch(`/api/tasks/${taskId}`)
      .send({ title: 'Unauthorized update' })
      .expect(401);

    await request(app).delete(`/api/tasks/${taskId}`).expect(401);
  });
});

describe('project and member permission regressions', () => {
  test('allows the owner to manage the project and its members', async () => {
    const { member, outsider, owner, project } = await createCollaborationFixture();

    await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    const updateResponse = await request(app)
      .patch(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Owner Updated Project' })
      .expect(200);
    expect(updateResponse.body.project.name).toBe('Owner Updated Project');

    const membersResponse = await request(app)
      .get(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(membersResponse.body.members).toEqual([
      expect.objectContaining({ email: member.user.email }),
    ]);

    await request(app)
      .post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: outsider.user.email })
      .expect(200);

    await request(app)
      .delete(`/api/projects/${project._id}/members/${outsider.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    await request(app)
      .delete(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(mockDatabase.projects).toHaveLength(0);
  });

  test('lets a member read but not administer a shared project', async () => {
    const { member, outsider, project } = await createCollaborationFixture();

    await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    await request(app)
      .get(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    await request(app)
      .patch(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ name: 'Forbidden Member Update' })
      .expect(404);
    await request(app)
      .delete(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(404);
    await request(app)
      .post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ email: outsider.user.email })
      .expect(404);
    await request(app)
      .delete(`/api/projects/${project._id}/members/${member.user.id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(404);
  });
});

describe('task permission regressions', () => {
  test('allows the owner to view, create, edit, and delete project tasks', async () => {
    const { owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id);

    await request(app)
      .get(`/api/tasks/project/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ priority: 'high' })
      .expect(200);
    const statusResponse = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'in_progress' })
      .expect(200);
    expect(statusResponse.body.task.status).toBe('in_progress');
    await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(mockDatabase.tasks).toHaveLength(0);
  });

  test('allows member task creation and editing but rejects deletion without cleanup', async () => {
    const Task = require('../src/models/Task');
    const { member, project } = await createCollaborationFixture();
    const task = await createProjectTask(
      member.token,
      project._id,
      'Member-created task'
    );

    await request(app)
      .get(`/api/tasks/project/${project._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    const updateResponse = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: 'Member-edited task', status: 'in_progress' })
      .expect(200);
    expect(updateResponse.body.task.title).toBe('Member-edited task');

    const statusResponse = await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ status: 'completed' })
      .expect(200);
    expect(statusResponse.body.task.status).toBe('completed');

    const deleteResponse = await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(403);

    expect(deleteResponse.body.message).toBe(
      'Only the project owner can delete tasks.'
    );
    expect(Task.updateMany).not.toHaveBeenCalled();
    expect(Task.findByIdAndDelete).not.toHaveBeenCalled();

    await request(app)
      .get(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
  });
});

describe('document permission regressions', () => {
  test('allows the owner to view, create, update, and delete documents', async () => {
    const { owner, project } = await createCollaborationFixture();
    const document = await createProjectDocument(owner.token, project._id);

    await request(app)
      .get(`/api/documents/project/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    await request(app)
      .get(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    await request(app)
      .patch(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Owner Updated Document' })
      .expect(200);
    await request(app)
      .delete(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(mockDatabase.documents).toHaveLength(0);
  });

  test('allows member document reads but denies owner-only mutations', async () => {
    const { member, owner, project } = await createCollaborationFixture();
    const document = await createProjectDocument(owner.token, project._id);

    await request(app)
      .get(`/api/documents/project/${project._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    await request(app)
      .get(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);
    await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        title: 'Forbidden Document',
        content: 'Members cannot create documents.',
        project: project._id,
        sourceType: 'text',
      })
      .expect(404);
    await request(app)
      .patch(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ title: 'Forbidden Update' })
      .expect(404);
    await request(app)
      .delete(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(404);

    expect(mockDatabase.documents).toHaveLength(1);
  });
});

describe('outsider and unauthenticated permission regressions', () => {
  test('keeps project, task, member, and document resources hidden from outsiders', async () => {
    const { outsider, owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id);
    const document = await createProjectDocument(owner.token, project._id);

    await request(app)
      .get(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
    await request(app)
      .get(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ title: 'Forbidden outsider task', project: project._id })
      .expect(404);
    await request(app)
      .get(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
    await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ title: 'Forbidden outsider update' })
      .expect(404);
    await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
    await request(app)
      .get(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
  });

  test('rejects unauthenticated permission-sensitive requests', async () => {
    const projectId = new mockMongoose.Types.ObjectId().toString();
    const resourceId = new mockMongoose.Types.ObjectId().toString();

    const requests = [
      request(app).get(`/api/projects/${projectId}`),
      request(app).patch(`/api/projects/${projectId}`).send({ name: 'No auth' }),
      request(app).delete(`/api/projects/${projectId}`),
      request(app).get(`/api/projects/${projectId}/members`),
      request(app).post(`/api/projects/${projectId}/members`).send({ email: MEMBER.email }),
      request(app).delete(`/api/projects/${projectId}/members/${resourceId}`),
      request(app).post('/api/tasks').send({ title: 'No auth', project: projectId }),
      request(app).patch(`/api/tasks/${resourceId}`).send({ title: 'No auth' }),
      request(app).delete(`/api/tasks/${resourceId}`),
      request(app).get(`/api/documents/project/${projectId}`),
      request(app).post('/api/documents').send({
        title: 'No auth',
        content: 'No auth',
        project: projectId,
      }),
      request(app).patch(`/api/documents/${resourceId}`).send({ title: 'No auth' }),
      request(app).delete(`/api/documents/${resourceId}`),
    ];

    const responses = await Promise.all(requests);
    responses.forEach((response) => expect(response.status).toBe(401));
  });
});

describe('task comment API regressions', () => {
  test('allows collaborators to read comments oldest-first with safe authors and hides them from others', async () => {
    const { member, outsider, owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id);
    const ownerComment = await createTaskComment(owner.token, task._id, 'Owner opened the discussion.');
    const memberComment = await createTaskComment(member.token, task._id, 'Member replied.');

    mockDatabase.comments.find((comment) => mockIdsEqual(comment._id, ownerComment._id)).createdAt = new Date('2026-01-01');
    mockDatabase.comments.find((comment) => mockIdsEqual(comment._id, memberComment._id)).createdAt = new Date('2026-01-02');

    for (const collaborator of [owner, member]) {
      const response = await request(app)
        .get(`/api/tasks/${task._id}/comments`)
        .set('Authorization', `Bearer ${collaborator.token}`)
        .expect(200);

      expect(response.body.comments.map((comment) => comment.content)).toEqual([
        'Owner opened the discussion.',
        'Member replied.',
      ]);
      expect(response.body.comments[0].author).toEqual({
        _id: owner.user.id,
        name: owner.user.name,
      });
      expect(response.body.comments[0].author).not.toHaveProperty('email');
      expect(response.body.comments[0].author).not.toHaveProperty('passwordHash');
    }

    await request(app)
      .get(`/api/tasks/${task._id}/comments`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
    await request(app).get(`/api/tasks/${task._id}/comments`).expect(401);
    await request(app)
      .post(`/api/tasks/${task._id}/comments`)
      .send({ content: 'No authentication.' })
      .expect(401);

    await request(app)
      .delete(`/api/projects/${project._id}/members/${member.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    await request(app)
      .get(`/api/tasks/${task._id}/comments`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(404);
  });

  test('derives comment references on the server for both owner and member creation', async () => {
    const { member, owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id);
    const attackerId = new mockMongoose.Types.ObjectId().toString();

    const ownerResponse = await request(app)
      .post(`/api/tasks/${task._id}/comments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        content: '  Server-derived owner comment.  ',
        author: attackerId,
        project: attackerId,
        task: attackerId,
      })
      .expect(201);
    const memberResponse = await request(app)
      .post(`/api/tasks/${task._id}/comments`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ content: 'Member comment.' })
      .expect(201);

    expect(ownerResponse.body.comment).toMatchObject({
      content: 'Server-derived owner comment.',
      task: task._id,
      project: project._id,
      author: { _id: owner.user.id, name: owner.user.name },
    });
    expect(memberResponse.body.comment.author._id).toBe(member.user.id);
    expect(mockDatabase.comments[0]).toMatchObject({
      task: expect.anything(),
      project: expect.anything(),
      author: expect.anything(),
    });
    expect(mockDatabase.comments[0].task.toString()).toBe(task._id.toString());
    expect(mockDatabase.comments[0].project.toString()).toBe(project._id.toString());
    expect(mockDatabase.comments[0].author.toString()).toBe(owner.user.id.toString());
  });

  test('enforces comment content validation and accepts the exact length boundary', async () => {
    const { owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id);

    for (const content of [undefined, null, 42, '', '   ', 'x'.repeat(5001)]) {
      const response = await request(app)
        .post(`/api/tasks/${task._id}/comments`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send(content === undefined ? {} : { content });
      expect(response.status).toBe(400);
    }

    await request(app)
      .post(`/api/tasks/${task._id}/comments`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ content: 'x'.repeat(5000) })
      .expect(201);
  });

  test('allows author-only edits while ignoring immutable-reference payloads', async () => {
    const { member, outsider, owner, project, storedProject } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id);
    const memberComment = await createTaskComment(member.token, task._id, 'Original member words.');
    const attackerId = new mockMongoose.Types.ObjectId().toString();

    const updateResponse = await request(app)
      .patch(`/api/comments/${memberComment._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ content: '  Updated member words.  ', author: attackerId, task: attackerId, project: attackerId })
      .expect(200);
    expect(updateResponse.body.comment).toMatchObject({
      content: 'Updated member words.',
      task: task._id,
      project: project._id,
      author: { _id: member.user.id, name: member.user.name },
    });

    const ownerEdit = await request(app)
      .patch(`/api/comments/${memberComment._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ content: 'Owner must not rewrite this.' })
      .expect(403);
    expect(ownerEdit.body.message).toBe('You can only edit your own comments.');

    storedProject.members.push(outsider.user.id);
    await request(app)
      .patch(`/api/comments/${memberComment._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ content: 'Another member must not rewrite this.' })
      .expect(403);
    storedProject.members = storedProject.members.filter((id) => !mockIdsEqual(id, outsider.user.id));

    await request(app)
      .patch(`/api/comments/${memberComment._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ content: 'Hidden outsider edit.' })
      .expect(404);
    await request(app)
      .patch(`/api/comments/${memberComment._id}`)
      .send({ content: 'No authentication.' })
      .expect(401);
    await request(app)
      .patch(`/api/comments/${memberComment._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ content: '   ' })
      .expect(400);
  });

  test('allows author and owner deletion but forbids other members and outsiders', async () => {
    const { member, outsider, owner, project, storedProject } = await createCollaborationFixture();
    storedProject.members.push(outsider.user.id);
    const task = await createProjectTask(owner.token, project._id);
    const ownerComment = await createTaskComment(owner.token, task._id, 'Owner-owned comment.');
    const memberComment = await createTaskComment(member.token, task._id, 'Member-owned comment.');
    const memberSelfDeleteComment = await createTaskComment(member.token, task._id, 'Member deletes this.');

    const forbidden = await request(app)
      .delete(`/api/comments/${memberComment._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(403);
    expect(forbidden.body.message).toBe(
      'Only the comment author or project owner can delete comments.'
    );

    storedProject.members = storedProject.members.filter((id) => !mockIdsEqual(id, outsider.user.id));
    await request(app)
      .delete(`/api/comments/${memberComment._id}`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
    await request(app).delete(`/api/comments/${memberComment._id}`).expect(401);

    await request(app)
      .delete(`/api/comments/${memberSelfDeleteComment._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    await request(app)
      .delete(`/api/comments/${memberComment._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    await request(app)
      .delete(`/api/comments/${ownerComment._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(mockDatabase.comments).toHaveLength(0);
  });

  test('deletes task comments atomically while preserving dependency cleanup', async () => {
    const Comment = require('../src/models/Comment');
    const Task = require('../src/models/Task');
    const { owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id, 'Task with discussion');
    const dependentTask = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Dependent task', project: project._id, dependencies: [task._id] })
      .expect(201);
    await createTaskComment(owner.token, task._id);

    await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);

    expect(mockDatabase.comments).toHaveLength(0);
    expect(mockDatabase.tasks.find((item) => mockIdsEqual(item._id, dependentTask.body.task._id)).dependencies).toEqual([]);
    const taskSession = Task.updateMany.mock.calls.at(-1)[2].session;
    expect(Comment.deleteMany.mock.calls.at(-1)[1].session).toBe(taskSession);
    expect(Task.findByIdAndDelete.mock.calls.at(-1)[1].session).toBe(taskSession);

    const rollbackTask = await createProjectTask(owner.token, project._id, 'Rollback task');
    const rollbackDependent = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Rollback dependent', project: project._id, dependencies: [rollbackTask._id] })
      .expect(201);
    await createTaskComment(owner.token, rollbackTask._id, 'Must survive rollback.');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    Comment.deleteMany.mockRejectedValueOnce(new Error('Simulated comment cleanup failure'));

    await request(app)
      .delete(`/api/tasks/${rollbackTask._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(500);
    consoleError.mockRestore();

    expect(mockDatabase.tasks.some((item) => mockIdsEqual(item._id, rollbackTask._id))).toBe(true);
    expect(mockDatabase.comments.some((item) => mockIdsEqual(item.task, rollbackTask._id))).toBe(true);
    expect(mockDatabase.tasks.find((item) => mockIdsEqual(item._id, rollbackDependent.body.task._id)).dependencies)
      .toEqual([expect.anything()]);
  });

  test('deletes project comments in its transaction and rolls all cleanup back on failure', async () => {
    const Comment = require('../src/models/Comment');
    const { owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id);
    await createTaskComment(owner.token, task._id);

    const Project = require('../src/models/Project');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    Project.deleteOne.mockRejectedValueOnce(new Error('Simulated project deletion failure'));
    await request(app)
      .delete(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(500);
    consoleError.mockRestore();

    expect(mockDatabase.projects).toHaveLength(1);
    expect(mockDatabase.tasks).toHaveLength(1);
    expect(mockDatabase.comments).toHaveLength(1);

    await request(app)
      .delete(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(Comment.deleteMany.mock.calls.at(-1)[0]).toEqual({ project: expect.anything() });
    expect(Comment.deleteMany.mock.calls.at(-1)[1]).toEqual({ session: expect.any(Object) });
    expect(mockDatabase.projects).toHaveLength(0);
    expect(mockDatabase.tasks).toHaveLength(0);
    expect(mockDatabase.comments).toHaveLength(0);
  });
});
