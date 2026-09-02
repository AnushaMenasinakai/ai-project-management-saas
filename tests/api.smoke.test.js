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

const mockDatabase = { users: [], projects: [], tasks: [] };

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
    project.toObject = () => ({ ...project, toObject: undefined });
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
}));

const app = require('../src/app');

const OWNER = {
  name: 'Test Owner',
  email: 'owner@test.local',
  password: 'test-password-123',
};

const clearDatabase = async () => {
  mockDatabase.users.length = 0;
  mockDatabase.projects.length = 0;
  mockDatabase.tasks.length = 0;
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
