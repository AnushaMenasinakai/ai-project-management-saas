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
const mockGenerateProjectTasks = jest.fn();
const mockGenerateRagAnswer = jest.fn();

const mockDatabase = {
  users: [],
  projects: [],
  tasks: [],
  documents: [],
  chunks: [],
  comments: [],
  activities: [],
  notifications: [],
};

jest.mock('../src/services/aiTaskService', () => ({
  generateProjectTasks: mockGenerateProjectTasks,
}));
jest.mock('../src/services/ragService', () => ({
  generateRagAnswer: mockGenerateRagAnswer,
}));

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
  findById: jest.fn((id) => {
    const user = mockDatabase.users.find((candidate) => mockIdsEqual(candidate._id, id)) || null;
    const result = Promise.resolve(user);
    result.select = jest.fn(async () => (
      user ? { _id: user._id, name: user.name } : null
    ));
    return result;
  }),
  findOne: jest.fn(async ({ email }) =>
    mockDatabase.users.find((user) => user.email === email) || null
  ),
}));

jest.mock('../src/models/Project', () => ({
  create: jest.fn(async (input) => {
    const data = Array.isArray(input) ? input[0] : input;
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
    return Array.isArray(input) ? [project] : project;
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
  findById: jest.fn(async (id) =>
    mockDatabase.projects.find((project) => mockIdsEqual(project._id, id)) || null
  ),
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
  create: jest.fn(async (input) => {
    const data = Array.isArray(input) ? input[0] : input;
    const now = new Date();
    const task = {
      _id: new mockMongoose.Types.ObjectId(),
      dependencies: [],
      ...data,
      status: data.status ?? 'todo',
      priority: data.priority ?? 'medium',
      createdAt: now,
      updatedAt: now,
    };
    mockDatabase.tasks.push(task);
    return Array.isArray(input) ? [task] : task;
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

jest.mock('../src/models/Activity', () => ({
  create: jest.fn(async (input) => {
    const data = Array.isArray(input) ? input[0] : input;
    const activity = {
      _id: new mockMongoose.Types.ObjectId(),
      ...data,
      createdAt: new Date(),
    };
    mockDatabase.activities.push(activity);
    return Array.isArray(input) ? [activity] : activity;
  }),
  find: jest.fn((query) => {
    let limit = Infinity;
    let selectedFields = null;
    const chain = {
      select: jest.fn((fields) => {
        selectedFields = new Set(fields.split(/\s+/));
        return chain;
      }),
      sort: jest.fn(() => chain),
      limit: jest.fn((value) => {
        limit = value;
        return chain;
      }),
      lean: jest.fn(async () => mockDatabase.activities
        .filter((activity) => {
          if (!mockIdsEqual(activity.project, query.project)) return false;
          if (!query.$or) return true;
          return query.$or.some((condition) => {
            if (condition.createdAt?.$lt) return activity.createdAt < condition.createdAt.$lt;
            return activity.createdAt.getTime() === condition.createdAt.getTime()
              && activity._id.toString() < condition._id.$lt.toString();
          });
        })
        .sort((left, right) => (
          right.createdAt - left.createdAt
          || right._id.toString().localeCompare(left._id.toString())
        ))
        .slice(0, limit)
        .map((activity) => (
          selectedFields
            ? Object.fromEntries(Object.entries(activity).filter(([key]) => selectedFields.has(key)))
            : { ...activity }
        ))),
    };
    return chain;
  }),
  deleteMany: jest.fn(async (query) => {
    mockDatabase.activities = mockDatabase.activities.filter(
      (activity) => !mockIdsEqual(activity.project, query.project)
    );
    return { acknowledged: true };
  }),
}));

jest.mock('../src/models/Notification', () => {
  const safeSelect = (notification, fields) => {
    if (!notification || !fields) return notification;
    const selected = new Set(fields.split(/\s+/));
    return Object.fromEntries(Object.entries(notification).filter(([key]) => selected.has(key)));
  };
  const matches = (notification, query) => {
    if (query._id && !mockIdsEqual(notification._id, query._id)) return false;
    if (query.recipient && !mockIdsEqual(notification.recipient, query.recipient)) return false;
    if (Object.hasOwn(query, 'readAt') && query.readAt === null && notification.readAt !== null) return false;
    if (!query.$or) return true;
    return query.$or.some((condition) => {
      if (condition.createdAt?.$lt) return notification.createdAt < condition.createdAt.$lt;
      return notification.createdAt.getTime() === condition.createdAt.getTime()
        && notification._id.toString() < condition._id.$lt.toString();
    });
  };
  const selectable = (getValue) => {
    let fields;
    const promise = Promise.resolve().then(() => safeSelect(getValue(), fields));
    promise.select = jest.fn((value) => { fields = value; return promise; });
    return promise;
  };
  return {
    create: jest.fn(async (input) => {
      const values = Array.isArray(input) ? input : [input];
      const created = values.map((data) => ({
        _id: new mockMongoose.Types.ObjectId(), ...data, readAt: null, createdAt: new Date(),
      }));
      mockDatabase.notifications.push(...created);
      return Array.isArray(input) ? created : created[0];
    }),
    find: jest.fn((query) => {
      let fields;
      let limit = Infinity;
      const chain = {
        select: jest.fn((value) => { fields = value; return chain; }),
        sort: jest.fn(() => chain),
        limit: jest.fn((value) => { limit = value; return chain; }),
        lean: jest.fn(async () => mockDatabase.notifications.filter((item) => matches(item, query))
          .sort((left, right) => right.createdAt - left.createdAt
            || right._id.toString().localeCompare(left._id.toString()))
          .slice(0, limit).map((item) => safeSelect(item, fields))),
      };
      return chain;
    }),
    countDocuments: jest.fn(async (query) =>
      mockDatabase.notifications.filter((item) => matches(item, query)).length
    ),
    findOne: jest.fn((query) => selectable(() =>
      mockDatabase.notifications.find((item) => matches(item, query)) || null
    )),
    findOneAndUpdate: jest.fn((query, updates) => selectable(() => {
      const item = mockDatabase.notifications.find((candidate) => matches(candidate, query)) || null;
      if (item) Object.assign(item, updates);
      return item;
    })),
    updateMany: jest.fn(async (query, updates) => {
      let modifiedCount = 0;
      mockDatabase.notifications.forEach((item) => {
        if (matches(item, query)) { Object.assign(item, updates); modifiedCount += 1; }
      });
      return { acknowledged: true, modifiedCount };
    }),
    deleteMany: jest.fn(async (query) => {
      const before = mockDatabase.notifications.length;
      mockDatabase.notifications = mockDatabase.notifications.filter((item) => !matches(item, query));
      return { acknowledged: true, deletedCount: before - mockDatabase.notifications.length };
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
      activities: mockDatabase.activities.map((activity) => ({ ...activity })),
      notifications: mockDatabase.notifications.map((notification) => ({ ...notification })),
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
  mockDatabase.activities.length = 0;
  mockDatabase.notifications.length = 0;
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

describe('activity log backend foundation', () => {
  test('records trusted project and task snapshots while ignoring hostile activity fields', async () => {
    const Activity = require('../src/models/Activity');
    const owner = await registerAndLogin(OWNER);
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        name: 'Trusted Project Name',
        actor: new mockMongoose.Types.ObjectId(),
        actorName: 'Forged Actor',
        type: 'forged_event',
        metadata: { password: 'never-store-this' },
      })
      .expect(201);
    const project = projectResponse.body.project;

    const member = await registerAndLogin(MEMBER);
    mockDatabase.projects.find((item) => mockIdsEqual(item._id, project._id)).members.push(member.user.id);
    const taskResponse = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${member.token}`)
      .send({
        title: 'Trusted Task Name',
        project: project._id,
        actorName: 'Forged Task Actor',
        metadata: { token: 'never-store-this' },
      })
      .expect(201);

    expect(mockDatabase.activities).toEqual([
      expect.objectContaining({
        project: expect.anything(),
        actor: expect.anything(),
        actorName: OWNER.name,
        type: 'project_created',
        entityType: 'project',
        entityId: expect.anything(),
        entityName: 'Trusted Project Name',
        metadata: {},
      }),
      expect.objectContaining({
        actorName: MEMBER.name,
        type: 'task_created',
        entityType: 'task',
        entityId: expect.anything(),
        entityName: 'Trusted Task Name',
        metadata: {},
      }),
    ]);
    expect(mockDatabase.activities.some((activity) => activity.actorName.includes('Forged'))).toBe(false);
    expect(mockDatabase.activities.some((activity) => activity.metadata.password || activity.metadata.token)).toBe(false);
    expect(Activity.create.mock.calls.every((call) => call[1]?.session)).toBe(true);
    expect(taskResponse.body.task._id).toBeTruthy();
  });

  test('allows collaborators to read isolated newest-first activity with cursor pagination', async () => {
    const { member, outsider, owner, project } = await createCollaborationFixture();
    await createProjectTask(owner.token, project._id, 'Older Task');
    await createProjectTask(member.token, project._id, 'Newest Task');
    mockDatabase.activities.forEach((activity, index) => {
      activity.createdAt = new Date(index === 0
        ? '2026-01-01T00:00:00.000Z'
        : '2026-01-02T00:00:00.000Z');
      activity.privateValue = 'must-not-leak';
    });
    await createOwnedProject(outsider.token);

    const firstPage = await request(app)
      .get(`/api/projects/${project._id}/activities?limit=2`)
      .set('Authorization', `Bearer ${member.token}`)
      .expect(200);

    expect(firstPage.body.activities.map((activity) => activity.entityName)).toEqual([
      'Newest Task',
      'Older Task',
    ]);
    expect(firstPage.body.activities.every((activity) => activity.project === project._id.toString())).toBe(true);
    expect(firstPage.body.activities[0]).not.toHaveProperty('privateValue');
    expect(firstPage.body.nextCursor).toEqual(expect.any(String));

    const secondPage = await request(app)
      .get(`/api/projects/${project._id}/activities?limit=2&cursor=${encodeURIComponent(firstPage.body.nextCursor)}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .expect(200);
    expect(secondPage.body.activities.map((activity) => activity.type)).toEqual(['project_created']);
    expect(secondPage.body.nextCursor).toBeNull();

    await request(app)
      .get(`/api/projects/${project._id}/activities`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .expect(404);
    await request(app).get(`/api/projects/${project._id}/activities`).expect(401);
  });

  test('validates activity limits and cursors predictably', async () => {
    const { token } = await registerAndLogin();
    const project = await createOwnedProject(token);

    for (const limit of ['0', '101', '1.5', 'nope']) {
      await request(app)
        .get(`/api/projects/${project._id}/activities?limit=${limit}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    }

    await request(app)
      .get(`/api/projects/${project._id}/activities?cursor=not-a-valid-cursor`)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  test('records only real task status changes with semantic metadata', async () => {
    const { member, project } = await createCollaborationFixture();
    const task = await createProjectTask(member.token, project._id, 'Move on Kanban');
    const initialCount = mockDatabase.activities.length;

    await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ status: 'in_progress' })
      .expect(200);

    expect(mockDatabase.activities).toHaveLength(initialCount + 1);
    expect(mockDatabase.activities.at(-1)).toMatchObject({
      actorName: MEMBER.name,
      type: 'task_status_changed',
      entityType: 'task',
      entityName: 'Move on Kanban',
      metadata: { from: 'todo', to: 'in_progress' },
    });

    await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ status: 'in_progress' })
      .expect(200);
    await request(app)
      .patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`)
      .send({ priority: 'high' })
      .expect(200);

    expect(mockDatabase.activities).toHaveLength(initialCount + 2);
    expect(mockDatabase.activities.at(-1)).toMatchObject({
      type: 'task_updated',
      metadata: { changedFields: ['priority'] },
    });
  });

  test('records project, member, and document events with trusted snapshots and no content leakage', async () => {
    const { member, outsider, owner, project } = await createCollaborationFixture();
    const initialCount = mockDatabase.activities.length;

    await request(app).patch(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: 'Renamed Project', description: 'Private project description' }).expect(200);
    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: outsider.user.email }).expect(200);
    await request(app).delete(`/api/projects/${project._id}/members/${outsider.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(200);
    const document = await createProjectDocument(owner.token, project._id);
    await request(app).patch(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Renamed Document', content: 'Sensitive replacement body' }).expect(200);
    await request(app).delete(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(200);

    const events = mockDatabase.activities.slice(initialCount);
    expect(events.map((event) => event.type)).toEqual([
      'project_updated', 'member_added', 'member_removed',
      'document_created', 'document_updated', 'document_deleted',
    ]);
    expect(events[0]).toMatchObject({
      actorName: OWNER.name, entityName: 'Renamed Project',
      metadata: { changedFields: ['name', 'description'] },
    });
    expect(events[1].entityName).toBe(OUTSIDER.name);
    expect(events[2].entityName).toBe(OUTSIDER.name);
    expect(events[4]).toMatchObject({
      entityName: 'Renamed Document', metadata: { changedFields: ['title', 'content'] },
    });
    expect(JSON.stringify(events)).not.toContain('Sensitive replacement body');
    expect(mockDatabase.activities.some((event) => event.type.startsWith('comment_'))).toBe(false);
  });

  test('records semantic task update, assignment, unassignment, and deletion events', async () => {
    const { member, outsider, owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id, 'Semantic task');
    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: outsider.user.email }).expect(200);
    const initialCount = mockDatabase.activities.length;

    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ status: 'in_progress', assignedTo: member.user.id, priority: 'high', title: 'Renamed task' })
      .expect(200);
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedTo: outsider.user.id }).expect(200);
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedTo: null }).expect(200);
    await request(app).delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(200);

    const events = mockDatabase.activities.slice(initialCount);
    expect(events.map((event) => event.type)).toEqual([
      'task_status_changed', 'task_assigned', 'task_updated', 'task_assigned',
      'task_unassigned', 'task_deleted',
    ]);
    expect(events[1].metadata).toMatchObject({ assigneeName: MEMBER.name });
    expect(events[2]).toMatchObject({
      entityName: 'Renamed task', metadata: { changedFields: ['title', 'priority'] },
    });
    expect(events[3].metadata).toMatchObject({
      previousAssigneeName: MEMBER.name, assigneeName: OUTSIDER.name,
    });
    expect(events[4].metadata).toMatchObject({ previousAssigneeName: OUTSIDER.name });
    expect(events[5]).toMatchObject({ entityName: 'Renamed task' });
    expect(mockDatabase.activities.some((event) => mockIdsEqual(event.entityId, task._id))).toBe(true);
  });

  test('does not record no-op project or task updates', async () => {
    const { owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id, 'No-op task');
    const document = await createProjectDocument(owner.token, project._id);
    const initialCount = mockDatabase.activities.length;
    await request(app).patch(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ name: `  ${project.name}  `, dueDate: '2026-09-06T00:00:00.000Z' }).expect(200);
    mockDatabase.projects.find((item) => mockIdsEqual(item._id, project._id)).dueDate = new Date('2026-09-06T00:00:00.000Z');
    const afterInitialDate = mockDatabase.activities.length;
    await request(app).patch(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ dueDate: '2026-09-06' }).expect(200);
    expect(mockDatabase.activities).toHaveLength(afterInitialDate);
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ title: ` ${task.title} ` }).expect(200);
    await request(app).patch(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ title: ` ${document.title} ` }).expect(200);
    expect(mockDatabase.activities).toHaveLength(initialCount + 1);
  });

  test('rolls back task deletion and document creation when activity persistence fails', async () => {
    const Activity = require('../src/models/Activity');
    const { owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id, 'Rollback deletion');
    const dependent = await createProjectTask(owner.token, project._id, 'Dependent task');
    mockDatabase.tasks.find((item) => mockIdsEqual(item._id, dependent._id)).dependencies = [task._id];
    await createTaskComment(owner.token, task._id, 'Must survive.');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    Activity.create.mockRejectedValueOnce(new Error('Task deletion activity failed'));
    await request(app).delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(500);
    expect(mockDatabase.tasks.some((item) => mockIdsEqual(item._id, task._id))).toBe(true);
    expect(mockDatabase.tasks.find((item) => mockIdsEqual(item._id, dependent._id)).dependencies)
      .toEqual([expect.anything()]);
    expect(mockDatabase.comments.some((comment) => mockIdsEqual(comment.task, task._id))).toBe(true);

    const documentCount = mockDatabase.documents.length;
    const chunkCount = mockDatabase.chunks.length;
    Activity.create.mockRejectedValueOnce(new Error('Document activity failed'));
    await request(app).post('/api/documents')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ title: 'Rollback document', content: 'Do not persist.', project: project._id, sourceType: 'text' })
      .expect(500);
    expect(mockDatabase.documents).toHaveLength(documentCount);
    expect(mockDatabase.chunks).toHaveLength(chunkCount);
    consoleError.mockRestore();
  });

  test('keeps project, membership, and document mutations atomic with activity writes', async () => {
    const Activity = require('../src/models/Activity');
    const { member, outsider, owner, project } = await createCollaborationFixture();
    const document = await createProjectDocument(owner.token, project._id);
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    Activity.create.mockRejectedValueOnce(new Error('Project update activity failed'));
    await request(app).patch(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ name: 'Must roll back' }).expect(500);
    expect(mockDatabase.projects.find((item) => mockIdsEqual(item._id, project._id)).name)
      .toBe(project.name);

    Activity.create.mockRejectedValueOnce(new Error('Member add activity failed'));
    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`).send({ email: outsider.user.email }).expect(500);
    expect(mockDatabase.projects.find((item) => mockIdsEqual(item._id, project._id)).members)
      .not.toContainEqual(expect.objectContaining({ _id: outsider.user.id }));

    Activity.create.mockRejectedValueOnce(new Error('Member remove activity failed'));
    await request(app).delete(`/api/projects/${project._id}/members/${member.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(500);
    expect(mockDatabase.projects.find((item) => mockIdsEqual(item._id, project._id)).members
      .some((id) => mockIdsEqual(id, member.user.id))).toBe(true);

    Activity.create.mockRejectedValueOnce(new Error('Document update activity failed'));
    await request(app).patch(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ title: 'Must roll back' }).expect(500);
    expect(mockDatabase.documents.find((item) => mockIdsEqual(item._id, document._id)).title)
      .toBe(document.title);

    Activity.create.mockRejectedValueOnce(new Error('Document deletion activity failed'));
    await request(app).delete(`/api/documents/${document._id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(500);
    expect(mockDatabase.documents.some((item) => mockIdsEqual(item._id, document._id))).toBe(true);
    consoleError.mockRestore();
  });

  test('rolls back database-only mutations when activity recording fails', async () => {
    const Activity = require('../src/models/Activity');
    const { token } = await registerAndLogin();
    const project = await createOwnedProject(token);
    const taskCount = mockDatabase.tasks.length;
    const activityCount = mockDatabase.activities.length;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    Activity.create.mockRejectedValueOnce(new Error('Simulated activity failure'));

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Must roll back', project: project._id })
      .expect(500);

    expect(mockDatabase.tasks).toHaveLength(taskCount);
    expect(mockDatabase.activities).toHaveLength(activityCount);

    const existingTask = await createProjectTask(token, project._id, 'Status must roll back');
    Activity.create.mockRejectedValueOnce(new Error('Simulated status activity failure'));
    await request(app)
      .patch(`/api/tasks/${existingTask._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' })
      .expect(500);

    expect(mockDatabase.tasks.find((task) => mockIdsEqual(task._id, existingTask._id)).status)
      .toBe('todo');
    consoleError.mockRestore();
  });

  test('retains task history but removes project activity atomically with project deletion', async () => {
    const Activity = require('../src/models/Activity');
    const Project = require('../src/models/Project');
    const { token } = await registerAndLogin();
    const project = await createOwnedProject(token);
    const task = await createProjectTask(token, project._id, 'History survives task deletion');

    await request(app)
      .delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(mockDatabase.activities.some((activity) => (
      activity.type === 'task_created' && mockIdsEqual(activity.entityId, task._id)
    ))).toBe(true);

    const beforeRollback = mockDatabase.activities.length;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    Project.deleteOne.mockRejectedValueOnce(new Error('Simulated deletion failure'));
    await request(app)
      .delete(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(500);
    consoleError.mockRestore();
    expect(mockDatabase.activities).toHaveLength(beforeRollback);

    await request(app)
      .delete(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(mockDatabase.activities).toHaveLength(0);
    expect(Activity.deleteMany.mock.calls.at(-1)[1]).toEqual({ session: expect.any(Object) });
  });

  test('exposes no public activity mutation route', async () => {
    const { token } = await registerAndLogin();
    const project = await createOwnedProject(token);
    const authorization = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/projects/${project._id}/activities`).set(authorization).send({}).expect(404);
    await request(app).patch('/api/activities/anything').set(authorization).send({}).expect(404);
    await request(app).delete('/api/activities/anything').set(authorization).expect(404);
  });
});

describe('project health API', () => {
  test('returns isolated deterministic health for owner and member without mutations', async () => {
    const { member, outsider, owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id, 'Health task');
    const storedTask = mockDatabase.tasks.find((item) => mockIdsEqual(item._id, task._id));
    storedTask.priority = 'high';
    storedTask.assignedTo = null;
    storedTask.description = 'Must never appear in health output.';
    const otherProject = await createOwnedProject(outsider.token);
    await createProjectTask(outsider.token, otherProject._id, 'Isolated task');
    const before = JSON.stringify({
      projects: mockDatabase.projects,
      tasks: mockDatabase.tasks,
      activities: mockDatabase.activities,
      notifications: mockDatabase.notifications,
    });

    const ownerResponse = await request(app).get(`/api/projects/${project._id}/health`)
      .set('Authorization', `Bearer ${owner.token}`).expect(200);
    const memberResponse = await request(app).get(`/api/projects/${project._id}/health`)
      .set('Authorization', `Bearer ${member.token}`).expect(200);
    expect(ownerResponse.body.health).toMatchObject({
      status: 'at_risk',
      project: { _id: project._id.toString(), name: project.name, status: project.status },
      metrics: {
        totalTasks: 1, completedTasks: 0, inProgressTasks: 0, todoTasks: 1,
        incompleteTasks: 1, completionPercentage: 0, highPriorityIncompleteTasks: 1,
        unassignedIncompleteTasks: 1,
      },
    });
    expect(memberResponse.body.health.metrics).toEqual(ownerResponse.body.health.metrics);
    expect(ownerResponse.body.health.attentionTasks[0]).toEqual(expect.objectContaining({
      _id: task._id.toString(), title: 'Health task', issues: expect.arrayContaining(['high_priority', 'unassigned']),
    }));
    expect(JSON.stringify(ownerResponse.body)).not.toContain('Must never appear');
    expect(JSON.stringify(ownerResponse.body)).not.toContain('Isolated task');
    expect(JSON.stringify({
      projects: mockDatabase.projects,
      tasks: mockDatabase.tasks,
      activities: mockDatabase.activities,
      notifications: mockDatabase.notifications,
    })).toBe(before);
    expect(mockGenerateProjectTasks).not.toHaveBeenCalled();
    expect(mockGenerateRagAnswer).not.toHaveBeenCalled();

    await request(app).get(`/api/projects/${project._id}/health`)
      .set('Authorization', `Bearer ${outsider.token}`).expect(404);
    await request(app).get('/api/projects/not-an-id/health')
      .set('Authorization', `Bearer ${owner.token}`).expect(404);
    await request(app).get(`/api/projects/${project._id}/health`).expect(401);
  });
});

describe('notification backend foundation', () => {
  test('creates trusted member and assignment notifications without client-forged data', async () => {
    const { member, owner, project } = await createCollaborationFixture();
    const storedProject = mockDatabase.projects.find((item) => mockIdsEqual(item._id, project._id));
    storedProject.members = [];

    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ email: member.user.email, recipient: owner.user.id, actorName: 'Forged' })
      .expect(200);
    const task = await createProjectTask(owner.token, project._id, 'Notification task');
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedTo: member.user.id, notification: { type: 'forged' } }).expect(200);

    expect(mockDatabase.notifications).toHaveLength(2);
    expect(mockDatabase.notifications[0]).toMatchObject({
      recipient: expect.anything(), actorName: OWNER.name,
      projectName: project.name, type: 'project_member_added',
      entityType: 'project', entityName: project.name, metadata: {},
    });
    expect(mockDatabase.notifications[1]).toMatchObject({
      actorName: OWNER.name, type: 'task_assigned', entityType: 'task',
      entityName: 'Notification task', metadata: {},
    });
    expect(mockIdsEqual(mockDatabase.notifications[1].recipient, member.user.id)).toBe(true);
    expect(JSON.stringify(mockDatabase.notifications)).not.toContain(member.user.email);
    expect(JSON.stringify(mockDatabase.notifications)).not.toContain('Forged');
  });

  test('suppresses self assignment, avoids same-assignee duplicates, and notifies both sides of reassignment', async () => {
    const { member, outsider, owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(member.token, project._id, 'Responsibility');

    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`).send({ assignedTo: member.user.id }).expect(200);
    expect(mockDatabase.notifications).toHaveLength(0);
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: member.user.id }).expect(200);
    expect(mockDatabase.notifications).toHaveLength(0);

    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`).send({ email: outsider.user.email }).expect(200);
    const beforeReassignment = mockDatabase.notifications.length;
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: outsider.user.id }).expect(200);
    const reassignment = mockDatabase.notifications.slice(beforeReassignment);
    expect(reassignment).toHaveLength(2);
    expect(reassignment.map((item) => item.type)).toEqual(['task_unassigned', 'task_assigned']);
    expect(mockIdsEqual(reassignment[0].recipient, member.user.id)).toBe(true);
    expect(mockIdsEqual(reassignment[1].recipient, outsider.user.id)).toBe(true);
  });

  test('applies self-suppression independently for reassignment and explicit unassignment', async () => {
    const { member, outsider, owner, project } = await createCollaborationFixture();
    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`).send({ email: outsider.user.email }).expect(200);
    const task = await createProjectTask(owner.token, project._id, 'Self suppression');
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: member.user.id }).expect(200);

    mockDatabase.notifications = [];
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`).send({ assignedTo: outsider.user.id }).expect(200);
    expect(mockDatabase.notifications).toHaveLength(1);
    expect(mockDatabase.notifications[0].type).toBe('task_assigned');
    expect(mockIdsEqual(mockDatabase.notifications[0].recipient, outsider.user.id)).toBe(true);

    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: member.user.id }).expect(200);
    mockDatabase.notifications = [];
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${outsider.token}`).send({ assignedTo: outsider.user.id }).expect(200);
    expect(mockDatabase.notifications).toHaveLength(1);
    expect(mockDatabase.notifications[0].type).toBe('task_unassigned');
    expect(mockIdsEqual(mockDatabase.notifications[0].recipient, member.user.id)).toBe(true);

    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: member.user.id }).expect(200);
    mockDatabase.notifications = [];
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${member.token}`).send({ assignedTo: null }).expect(200);
    expect(mockDatabase.notifications).toHaveLength(0);
  });

  test('notifies only the final assignee about real status changes', async () => {
    const { member, outsider, owner, project } = await createCollaborationFixture();
    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`).send({ email: outsider.user.email }).expect(200);
    const task = await createProjectTask(owner.token, project._id, 'Status recipient');
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: member.user.id }).expect(200);

    mockDatabase.notifications = [];
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedTo: outsider.user.id, status: 'in_progress', priority: 'high' }).expect(200);
    expect(mockDatabase.notifications.map((item) => item.type)).toEqual([
      'task_unassigned', 'task_assigned', 'assigned_task_status_changed',
    ]);
    expect(mockIdsEqual(mockDatabase.notifications[2].recipient, outsider.user.id)).toBe(true);
    expect(mockDatabase.notifications[2].metadata).toEqual({ from: 'todo', to: 'in_progress' });

    mockDatabase.notifications = [];
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${outsider.token}`).send({ status: 'completed' }).expect(200);
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ status: 'completed' }).expect(200);
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ title: 'Ordinary update' }).expect(200);
    expect(mockDatabase.notifications).toHaveLength(0);

    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: null, status: 'todo' }).expect(200);
    expect(mockDatabase.notifications).toHaveLength(1);
    expect(mockDatabase.notifications[0].type).toBe('task_unassigned');

    mockDatabase.notifications = [];
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ status: 'in_progress' }).expect(200);
    expect(mockDatabase.notifications).toHaveLength(0);
  });

  test('sends assignment and status notifications together for an initial final assignee', async () => {
    const { member, owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id, 'Initial combined change');
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedTo: member.user.id, status: 'in_progress' }).expect(200);
    expect(mockDatabase.notifications.map((item) => item.type)).toEqual([
      'task_assigned', 'assigned_task_status_changed',
    ]);
  });

  test('rolls back a multi-change task patch when a later notification fails', async () => {
    const Notification = require('../src/models/Notification');
    const { member, outsider, owner, project } = await createCollaborationFixture();
    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`).send({ email: outsider.user.email }).expect(200);
    const task = await createProjectTask(owner.token, project._id, 'Atomic multi-notification');
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: member.user.id }).expect(200);
    const originalCreate = Notification.create.getMockImplementation();
    const activityCount = mockDatabase.activities.length;
    const notificationCount = mockDatabase.notifications.length;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    Notification.create.mockImplementationOnce(originalCreate)
      .mockRejectedValueOnce(new Error('second notification failed'));

    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ assignedTo: outsider.user.id, status: 'in_progress', priority: 'high' }).expect(500);
    const storedTask = mockDatabase.tasks.find((item) => mockIdsEqual(item._id, task._id));
    expect(mockIdsEqual(storedTask.assignedTo, member.user.id)).toBe(true);
    expect(storedTask.status).toBe('todo');
    expect(storedTask.priority).toBe('medium');
    expect(mockDatabase.activities).toHaveLength(activityCount);
    expect(mockDatabase.notifications).toHaveLength(notificationCount);
    consoleError.mockRestore();
  });

  test('returns only the authenticated inbox with deterministic cursor pagination', async () => {
    const owner = await registerAndLogin(OWNER);
    const member = await registerAndLogin(MEMBER);
    const project = await createOwnedProject(owner.token);
    const createStored = (recipient, name, createdAt) => mockDatabase.notifications.push({
      _id: new mockMongoose.Types.ObjectId(), recipient, actor: owner.user.id,
      actorName: OWNER.name, project: project._id, projectName: project.name,
      type: 'task_assigned', entityType: 'task', entityId: new mockMongoose.Types.ObjectId(),
      entityName: name, metadata: {}, readAt: null, createdAt: new Date(createdAt), privateValue: 'hidden',
    });
    createStored(owner.user.id, 'Older', '2026-01-01T00:00:00.000Z');
    createStored(owner.user.id, 'Newer', '2026-01-02T00:00:00.000Z');
    createStored(member.user.id, 'Other inbox', '2026-01-03T00:00:00.000Z');

    const first = await request(app).get('/api/notifications?limit=1')
      .set('Authorization', `Bearer ${owner.token}`).expect(200);
    expect(first.body.notifications.map((item) => item.entityName)).toEqual(['Newer']);
    expect(first.body.notifications[0]).not.toHaveProperty('privateValue');
    expect(first.body.nextCursor).toEqual(expect.any(String));
    const second = await request(app)
      .get(`/api/notifications?limit=1&cursor=${encodeURIComponent(first.body.nextCursor)}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(200);
    expect(second.body.notifications.map((item) => item.entityName)).toEqual(['Older']);
    expect(second.body.nextCursor).toBeNull();
    await request(app).get('/api/notifications').expect(401);
    for (const value of ['0', '101', '1.5', 'bad']) {
      await request(app).get(`/api/notifications?limit=${value}`)
        .set('Authorization', `Bearer ${owner.token}`).expect(400);
    }
    await request(app).get('/api/notifications?cursor=bad')
      .set('Authorization', `Bearer ${owner.token}`).expect(400);
    await request(app).get('/api/notifications?limit=100')
      .set('Authorization', `Bearer ${owner.token}`).expect(200);
  });

  test('counts unread and marks one or all read without crossing recipient boundaries', async () => {
    const { member, owner, project } = await createCollaborationFixture();
    const now = new Date('2026-01-01T00:00:00.000Z');
    const seed = (recipient, readAt = null) => ({
      _id: new mockMongoose.Types.ObjectId(), recipient, actor: owner.user.id,
      actorName: OWNER.name, project: project._id, projectName: project.name,
      type: 'task_assigned', entityType: 'task', entityId: new mockMongoose.Types.ObjectId(),
      entityName: 'Inbox task', metadata: {}, readAt, createdAt: new Date(),
    });
    const unread = seed(member.user.id);
    const secondUnread = seed(member.user.id);
    const alreadyRead = seed(member.user.id, now);
    const other = seed(owner.user.id);
    mockDatabase.notifications.push(unread, secondUnread, alreadyRead, other);

    await request(app).get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${member.token}`).expect(200, { unreadCount: 2 });
    await request(app).patch(`/api/notifications/${other._id}/read`)
      .set('Authorization', `Bearer ${member.token}`).expect(404);
    await request(app).patch('/api/notifications/not-an-id/read')
      .set('Authorization', `Bearer ${member.token}`).expect(400);
    const marked = await request(app).patch(`/api/notifications/${unread._id}/read`)
      .set('Authorization', `Bearer ${member.token}`).expect(200);
    const firstReadAt = marked.body.notification.readAt;
    const again = await request(app).patch(`/api/notifications/${unread._id}/read`)
      .set('Authorization', `Bearer ${member.token}`).expect(200);
    expect(again.body.notification.readAt).toBe(firstReadAt);
    const all = await request(app).patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${member.token}`).expect(200);
    expect(all.body.modifiedCount).toBe(1);
    const allAgain = await request(app).patch('/api/notifications/read-all')
      .set('Authorization', `Bearer ${member.token}`).expect(200);
    expect(allAgain.body.modifiedCount).toBe(0);
    expect(alreadyRead.readAt).toEqual(now);
    expect(other.readAt).toBeNull();
  });

  test('rolls back assignment and member addition when notification persistence fails', async () => {
    const Notification = require('../src/models/Notification');
    const { member, outsider, owner, project } = await createCollaborationFixture();
    const task = await createProjectTask(owner.token, project._id, 'Atomic notification');
    const activityCount = mockDatabase.activities.length;
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    Notification.create.mockRejectedValueOnce(new Error('notification failed'));
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: member.user.id }).expect(500);
    expect(mockDatabase.tasks.find((item) => mockIdsEqual(item._id, task._id)).assignedTo).toBeUndefined();
    expect(mockDatabase.activities).toHaveLength(activityCount);

    Notification.create.mockRejectedValueOnce(new Error('notification failed'));
    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`).send({ email: outsider.user.email }).expect(500);
    expect(mockDatabase.projects.find((item) => mockIdsEqual(item._id, project._id)).members
      .some((id) => mockIdsEqual(id, outsider.user.id))).toBe(false);
    consoleError.mockRestore();
  });

  test('retains task/member notifications but removes project notifications transactionally', async () => {
    const Notification = require('../src/models/Notification');
    const Project = require('../src/models/Project');
    const { member, owner, project } = await createCollaborationFixture();
    const storedProject = mockDatabase.projects.find((item) => mockIdsEqual(item._id, project._id));
    storedProject.members = [];
    await request(app).post(`/api/projects/${project._id}/members`)
      .set('Authorization', `Bearer ${owner.token}`).send({ email: member.user.email }).expect(200);
    const task = await createProjectTask(owner.token, project._id, 'Historical notification');
    await request(app).patch(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).send({ assignedTo: member.user.id }).expect(200);
    await request(app).delete(`/api/tasks/${task._id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(200);
    await request(app).delete(`/api/projects/${project._id}/members/${member.user.id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(200);
    expect(mockDatabase.notifications).toHaveLength(2);

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    Project.deleteOne.mockRejectedValueOnce(new Error('delete failed'));
    await request(app).delete(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(500);
    expect(mockDatabase.notifications).toHaveLength(2);
    await request(app).delete(`/api/projects/${project._id}`)
      .set('Authorization', `Bearer ${owner.token}`).expect(200);
    expect(mockDatabase.notifications).toHaveLength(0);
    expect(Notification.deleteMany.mock.calls.at(-1)[1]).toEqual({ session: expect.any(Object) });
    consoleError.mockRestore();
  });

  test('exposes no public notification create, delete, or arbitrary update route', async () => {
    const { token } = await registerAndLogin();
    const headers = { Authorization: `Bearer ${token}` };
    await request(app).post('/api/notifications').set(headers).send({}).expect(404);
    await request(app).delete('/api/notifications/anything').set(headers).expect(404);
    await request(app).patch('/api/notifications/anything').set(headers).send({}).expect(404);
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
