const mongoose = require('mongoose');

jest.mock('../src/models/Project', () => ({ findOne: jest.fn() }));
jest.mock('../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../src/models/Task', () => ({ find: jest.fn() }));
jest.mock('../src/services/taskDependencyService', () => ({
  hasCircularDependency: jest.fn(),
}));
jest.mock('../src/utils/chunkText', () => jest.fn());
jest.mock('../src/services/embeddingService', () => ({
  generateEmbedding: jest.fn(),
}));

const Project = require('../src/models/Project');
const User = require('../src/models/User');
const Task = require('../src/models/Task');
const chunkText = require('../src/utils/chunkText');
const { generateEmbedding } = require('../src/services/embeddingService');
const { hasCircularDependency } = require('../src/services/taskDependencyService');
const {
  findProjectForCollaborator,
  findProjectForOwner,
} = require('../src/services/projectAccessService');
const {
  validateTaskAssignee,
  validateTaskDependencies,
} = require('../src/services/taskValidationService');
const { prepareDocumentChunks } = require('../src/services/documentChunkService');

describe('backend refactor service boundaries', () => {
  beforeEach(() => jest.clearAllMocks());

  test('keeps collaborator and owner project queries explicit', () => {
    const projectId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();

    findProjectForCollaborator(projectId, userId);
    findProjectForOwner(projectId, userId);

    expect(Project.findOne).toHaveBeenNthCalledWith(1, {
      _id: projectId,
      $or: [{ owner: userId }, { members: userId }],
    });
    expect(Project.findOne).toHaveBeenNthCalledWith(2, {
      _id: projectId,
      owner: userId,
    });
  });

  test('validates an assignee against the project member list', async () => {
    const assigneeId = new mongoose.Types.ObjectId();
    User.findById.mockResolvedValue({ _id: assigneeId });

    await expect(validateTaskAssignee(assigneeId, { members: [assigneeId] }))
      .resolves.toEqual({ value: assigneeId });
  });

  test('preserves update support for clearing an assignee', async () => {
    await expect(validateTaskAssignee('', { members: [] }, { allowUnassigned: true }))
      .resolves.toEqual({ value: null });
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('rejects dependencies that do not all belong to the project', async () => {
    const dependencyId = new mongoose.Types.ObjectId();
    Task.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    await expect(validateTaskDependencies([dependencyId], new mongoose.Types.ObjectId()))
      .resolves.toEqual({
        error: {
          status: 400,
          message: 'All dependencies must belong to the same project.',
        },
      });
  });

  test('rejects dependency cycles during task updates', async () => {
    const taskId = new mongoose.Types.ObjectId();
    const dependencyId = new mongoose.Types.ObjectId();
    Task.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: dependencyId }]),
    });
    hasCircularDependency.mockResolvedValue(true);

    await expect(validateTaskDependencies(
      [dependencyId],
      new mongoose.Types.ObjectId(),
      { taskId }
    )).resolves.toEqual({
      error: {
        status: 400,
        message: 'Dependencies cannot create a circular relationship.',
      },
    });
  });

  test('prepares ordered document chunks and embeddings', async () => {
    chunkText.mockReturnValue(['first', 'second']);
    generateEmbedding
      .mockResolvedValueOnce([1, 0])
      .mockResolvedValueOnce([0, 1]);

    await expect(prepareDocumentChunks('document content')).resolves.toEqual([
      { content: 'first', chunkIndex: 0, embedding: [1, 0] },
      { content: 'second', chunkIndex: 1, embedding: [0, 1] },
    ]);
  });
});
