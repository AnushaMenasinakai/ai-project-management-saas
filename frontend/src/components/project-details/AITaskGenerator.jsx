import Alert from '../Alert';

const AITaskGenerator = ({
  generatingTasks,
  generateTasksError,
  generateTasksSuccess,
  onGenerate,
}) => (
  <section className="ai-task-generation" aria-labelledby="ai-task-generation-heading">
    <h3 id="ai-task-generation-heading">AI Task Generation</h3>
    <p className="ai-task-generation__description">
      Generate a set of tasks from this project's name and description.
    </p>
    <button type="button" onClick={onGenerate} disabled={generatingTasks}>
      {generatingTasks ? 'Generating Tasks...' : 'Generate Tasks with AI'}
    </button>
    <p className="ai-task-generation__note">
      Running AI generation again will create another set of tasks.
    </p>
    {generatingTasks && (
      <p className="ai-task-generation__status" role="status">
        AI is generating and organizing tasks for this project...
      </p>
    )}
    {generateTasksError && <Alert>{generateTasksError}</Alert>}
    {generateTasksSuccess && (
      <p className="ai-task-generation__success alert alert--success" role="status">
        {generateTasksSuccess}
      </p>
    )}
  </section>
);

export default AITaskGenerator;
